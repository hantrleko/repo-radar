"""
候选仓库分流与三层分组器 (较完整方案 / 可组合模块 / 部分满足需求)
"""
from typing import Dict, List, Tuple
from repo_radar.models.query import ParsedQuery, SearchResultItem
from repo_radar.models.repository import Repository
from repo_radar.models.evidence import EvidenceAnalysis
from repo_radar.ranking.scorer import Scorer

class Triager:
    def __init__(self):
        self.scorer = Scorer()

    def triage(
        self,
        candidates: List[Tuple[Repository, EvidenceAnalysis]],
        query: ParsedQuery
    ) -> Dict[str, List[SearchResultItem]]:
        """
        对候选仓库进行打分并划分为三组：
        - 较完整方案 (Score >= 75 或同时满足多项核心需求)
        - 可组合模块 (Score 55 - 74，或作为专用垂直组件)
        - 部分满足需求 (Score < 55)
        """
        complete_group: List[SearchResultItem] = []
        modular_group: List[SearchResultItem] = []
        partial_group: List[SearchResultItem] = []

        for repo, analysis in candidates:
            score, matched_reasons, unmatched_reasons = self.scorer.score(repo, analysis, query)
            
            # 判断分组逻辑
            if score >= 75:
                group_name = "较完整方案"
            elif score >= 55:
                group_name = "可组合模块"
            else:
                group_name = "部分满足需求"

            item = SearchResultItem(
                repository=repo,
                analysis=analysis,
                match_score=score,
                match_group=group_name,
                matched_reasons=matched_reasons,
                unmatched_reasons=unmatched_reasons
            )

            if group_name == "较完整方案":
                complete_group.append(item)
            elif group_name == "可组合模块":
                modular_group.append(item)
            else:
                partial_group.append(item)

        # 各组内按得分降序排序
        complete_group.sort(key=lambda x: x.match_score, reverse=True)
        modular_group.sort(key=lambda x: x.match_score, reverse=True)
        partial_group.sort(key=lambda x: x.match_score, reverse=True)

        return {
            "较完整方案": complete_group,
            "可组合模块": modular_group,
            "部分满足需求": partial_group,
        }
