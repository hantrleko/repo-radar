"""
持续监控与更新检查引擎 (支持定期发现新项目、README 变更感知与水位线更新)
"""
import hashlib
from datetime import datetime
from typing import List, Optional

from repo_radar.config import settings
from repo_radar.models.subscription import Subscription, ChangeEvent
from repo_radar.sources.github_client import GitHubClient, GitHubAPIError
from repo_radar.storage.repo_store import RepoStore
from repo_radar.storage.subscription_store import SubscriptionStore
from repo_radar.analysis.summarizer import EvidenceSummarizer

class SubscriptionMonitor:
    def __init__(
        self,
        repo_store: Optional[RepoStore] = None,
        subscription_store: Optional[SubscriptionStore] = None,
        github_client: Optional[GitHubClient] = None,
        summarizer: Optional[EvidenceSummarizer] = None
    ):
        self.repo_store = repo_store or RepoStore()
        self.sub_store = subscription_store or SubscriptionStore()
        self.client = github_client or GitHubClient()
        self.summarizer = summarizer or EvidenceSummarizer()

    def run_all_updates(self) -> List[ChangeEvent]:
        """运行所有处于激活状态的订阅刷新"""
        active_subs = self.sub_store.list_subscriptions(active_only=True)
        events_generated: List[ChangeEvent] = []

        for sub in active_subs:
            events = self.check_subscription(sub)
            events_generated.extend(events)

        return events_generated

    def check_subscription(self, sub: Subscription) -> List[ChangeEvent]:
        """检查单条订阅"""
        events: List[ChangeEvent] = []
        try:
            # 1. 检索符合条件的候选项目
            candidates = self.client.search_repositories(
                query=sub.query_str,
                sort="updated",
                per_page=10
            )
        except GitHubAPIError:
            return events

        latest_pushed = sub.last_pushed_watermark

        for repo in candidates:
            existing_repo = self.repo_store.get_repository(repo.github_id)
            if not existing_repo:
                # 发现新仓库！
                self.repo_store.save_repository(repo)
                
                # 尝试抓取 README 快照
                snapshot, _ = self.client.get_readme_snapshot(repo.owner, repo.name, repo.github_id)
                readme_text = snapshot.readme_text if snapshot else ""
                if snapshot:
                    self.repo_store.save_evidence_snapshot(snapshot)

                analysis = self.summarizer.summarize(repo, readme_text)
                self.repo_store.save_evidence_analysis(analysis)

                event = ChangeEvent(
                    subscription_id=sub.id,
                    repo_github_id=repo.github_id,
                    repo_full_name=repo.full_name,
                    change_type="新发现",
                    detail=f"在订阅 [{sub.name}] 中新发现项目: {repo.description or repo.name}"
                )
                self.sub_store.record_change_event(event)
                events.append(event)
            else:
                # 已存在项目，检查是否发生变更
                # 检查归档状态
                if repo.is_archived != existing_repo.is_archived:
                    event = ChangeEvent(
                        subscription_id=sub.id,
                        repo_github_id=repo.github_id,
                        repo_full_name=repo.full_name,
                        change_type="归档或转移",
                        old_value="活跃" if not existing_repo.is_archived else "已归档",
                        new_value="已归档" if repo.is_archived else "活跃",
                        detail="仓库归档状态发生变动"
                    )
                    self.sub_store.record_change_event(event)
                    events.append(event)

                # 检查许可证变化
                if repo.license_spdx != existing_repo.license_spdx:
                    event = ChangeEvent(
                        subscription_id=sub.id,
                        repo_github_id=repo.github_id,
                        repo_full_name=repo.full_name,
                        change_type="许可证变化",
                        old_value=existing_repo.license_spdx or "无",
                        new_value=repo.license_spdx or "无",
                        detail=f"许可证从 {existing_repo.license_spdx} 变更为 {repo.license_spdx}"
                    )
                    self.sub_store.record_change_event(event)
                    events.append(event)

                # 检查 README 哈希变化
                latest_snap = self.repo_store.get_latest_snapshot(repo.github_id)
                new_snap, is_modified = self.client.get_readme_snapshot(repo.owner, repo.name, repo.github_id)
                if is_modified and new_snap:
                    if not latest_snap or new_snap.content_hash != latest_snap.content_hash:
                        self.repo_store.save_evidence_snapshot(new_snap)
                        # 重新生成证据分析
                        new_analysis = self.summarizer.summarize(repo, new_snap.readme_text)
                        self.repo_store.save_evidence_analysis(new_analysis)

                        event = ChangeEvent(
                            subscription_id=sub.id,
                            repo_github_id=repo.github_id,
                            repo_full_name=repo.full_name,
                            change_type="README功能变化",
                            detail="检测到项目 README 内容重大更新，已重新提取适用性证据"
                        )
                        self.sub_store.record_change_event(event)
                        events.append(event)

                # 更新元数据
                self.repo_store.save_repository(repo)

            if repo.pushed_at and (not latest_pushed or repo.pushed_at > latest_pushed):
                latest_pushed = repo.pushed_at

        # 更新水位线
        if sub.id and latest_pushed:
            self.sub_store.update_watermark(sub.id, latest_pushed)

        return events

if __name__ == "__main__":
    import sys
    print(f"[{datetime.now().isoformat()}] 启动个人开源雷达计划任务刷新...")
    monitor = SubscriptionMonitor()
    evts = monitor.run_all_updates()
    print(f"[{datetime.now().isoformat()}] 刷新完成，共生成 {len(evts)} 个变更事件。")
