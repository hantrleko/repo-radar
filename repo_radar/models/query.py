"""
查询意图与检索结果结构
"""
from dataclasses import dataclass, field
from typing import List, Optional
from repo_radar.models.repository import Repository
from repo_radar.models.evidence import EvidenceAnalysis

@dataclass
class ParsedQuery:
    original_query: str
    target: str = ""  # 核心目标
    required_capabilities: List[str] = field(default_factory=list)  # 必需能力
    preferences: List[str] = field(default_factory=list)  # 偏好（如轻量、有GUI等）
    environments: List[str] = field(default_factory=list)  # 运行环境约束（如 Windows, Python等）
    exclusions: List[str] = field(default_factory=list)  # 排除条件（如 不要付费API）
    target_languages: List[str] = field(default_factory=list)
    generated_github_queries: List[str] = field(default_factory=list)

@dataclass
class SearchResultItem:
    repository: Repository
    analysis: EvidenceAnalysis
    match_score: float  # 0.0 - 100.0
    match_group: str  # "较完整方案" | "可组合模块" | "部分满足需求"
    matched_reasons: List[str] = field(default_factory=list)
    unmatched_reasons: List[str] = field(default_factory=list)
