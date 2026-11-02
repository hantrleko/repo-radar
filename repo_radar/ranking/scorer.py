"""
证据与需求匹配度评分器 (结合关键词匹配、环境契合度与维护信号)
"""
import math
from typing import List, Tuple
from repo_radar.models.repository import Repository
from repo_radar.models.evidence import EvidenceAnalysis
from repo_radar.models.query import ParsedQuery

class Scorer:
    def score(
        self,
        repo: Repository,
        analysis: EvidenceAnalysis,
        query: ParsedQuery
    ) -> Tuple[float, List[str], List[str]]:
        """
        计算项目在特定需求下的得分 (0 - 100)
        返回: (score, matched_reasons, unmatched_reasons)
        """
        score = 30.0  # 基础分
        matched = []
        unmatched = []

        # 1. 语言匹配
        if query.target_languages:
            req_lang = query.target_languages[0].lower()
            if repo.language and repo.language.lower() == req_lang:
                score += 20.0
                matched.append(f"编程语言匹配: {repo.language}")
            else:
                score -= 10.0
                unmatched.append(f"语言不一致 (当前: {repo.language or '未知'}, 需求: {query.target_languages[0]})")

        # 2. 必需能力匹配 (基于证据分析中的 satisfied_conditions)
        if query.required_capabilities:
            cap_hit_count = 0
            for cap in query.required_capabilities:
                # 检查描述、topics 或分析中的满足项
                text_corpus = f"{repo.full_name} {repo.description or ''} {' '.join(repo.topics)} {analysis.chinese_purpose}".lower()
                if cap.lower() in text_corpus or any(cap.lower() in s.lower() for s in analysis.satisfied_conditions):
                    cap_hit_count += 1
                    matched.append(f"命中核心能力: {cap}")
                else:
                    unmatched.append(f"未确认支持: {cap}")
            
            cap_ratio = cap_hit_count / len(query.required_capabilities)
            score += cap_ratio * 30.0

        # 3. 环境偏好匹配
        if "Windows" in query.environments:
            win_stat = analysis.os_compatibility.get("Windows", "未知")
            if win_stat == "支持":
                score += 15.0
                matched.append("有证据确认支持 Windows 环境")
            elif win_stat == "不支持":
                score -= 25.0
                unmatched.append("README 提示不支持 Windows")
            else:
                unmatched.append("Windows 兼容性未见明确说明 (存疑)")

        # 4. 维护信号校准
        if repo.is_archived:
            score -= 20.0
            unmatched.append("项目已归档 (只读状态)")
        elif analysis.maintenance_status == "活跃":
            score += 5.0

        # 5. Star 次级平滑加分 (使用对数缩放，杜绝唯 Star 论)
        if repo.stars > 0:
            star_bonus = min(10.0, math.log10(repo.stars + 1) * 2.0)
            score += star_bonus

        final_score = max(0.0, min(100.0, score))
        return round(final_score, 1), matched, unmatched
