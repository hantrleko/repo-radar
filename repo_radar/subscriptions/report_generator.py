"""
雷达变动简报生成器 (用于 GitHub Actions 自动生成并提交 Markdown 简报)
"""
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# 确保包路径可用
pkg_root = str(Path(__file__).resolve().parent.parent.parent)
if pkg_root not in sys.path:
    sys.path.insert(0, pkg_root)

from repo_radar.storage.repo_store import RepoStore
from repo_radar.storage.subscription_store import SubscriptionStore
from repo_radar.storage.collection_store import CollectionStore

def generate_markdown_digest(output_path: Optional[str] = None) -> str:
    repo_store = RepoStore()
    sub_store = SubscriptionStore()
    col_store = CollectionStore()

    repos = repo_store.list_all_repos(limit=200)
    subs = sub_store.list_subscriptions()
    events = sub_store.list_change_events(limit=30)
    collections = col_store.list_collections()

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    lines = [
        f"# 📡 个人开源项目雷达 · 监控简报 (Radar Digest)",
        f"",
        f"> **生成时间**：`{now_str}` (由 GitHub Actions 定时巡检任务自动生成)",
        f"",
        f"---",
        f"",
        f"## 📊 资产与监控全景",
        f"",
        f"- **已追踪项目**：`{len(repos)}` 个",
        f"- **活跃监控订阅**：`{len(subs)}` 条",
        f"- **当前收藏集合**：`{len(collections)}` 个",
        f"",
        f"---",
        f"",
        f"## 🔔 最新变动事件 (Recent Change Events)",
        f"",
    ]

    if not events:
        lines.append("*暂无新变更事件。所有受监控项目状态平稳。*")
    else:
        lines.append("| 变动类型 | 仓库名称 | 详细说明 | 发生时间 |")
        lines.append("| :--- | :--- | :--- | :--- |")
        for ev in events:
            badge = ev.change_type
            if ev.change_type == "新发现":
                badge = "✨ 新发现"
            elif ev.change_type == "README功能变化":
                badge = "📝 README变更"
            elif ev.change_type == "归档或转移":
                badge = "⚠️ 状态异动"
            elif ev.change_type == "许可证变化":
                badge = "⚖️ 协议变动"

            lines.append(f"| {badge} | [`{ev.repo_full_name}`](https://github.com/{ev.repo_full_name}) | {ev.detail} | {ev.occurred_at or '近期'} |")

    lines.extend([
        "",
        "---",
        "",
        "## 📋 活跃订阅一览",
        "",
        "| 订阅名称 | 归属领域 | 检索关键词 | 刷新水线 |",
        "| :--- | :--- | :--- | :--- |"
    ])

    for s in subs:
        lines.append(f"| **{s.name}** | `{s.domain or '通用'}` | `{s.query_str}` | `{s.last_pushed_watermark or '尚未记录'}` |")

    lines.extend([
        "",
        "---",
        "*本简报由 [个人开源项目雷达](https://github.com/hantrleko/repo-radar) GitHub Actions 自动化工作流自动生成。*",
        ""
    ])

    content = "\n".join(lines)
    if output_path:
        Path(output_path).write_text(content, encoding="utf-8")
    return content

if __name__ == "__main__":
    out_file = Path(__file__).resolve().parent.parent.parent / "LATEST_RADAR_DIGEST.md"
    generate_markdown_digest(str(out_file))
    print(f"[+] 雷达简报已生成至: {out_file}")
