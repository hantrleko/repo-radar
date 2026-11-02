"""
证据快照与适用性分析结构
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional

@dataclass
class EvidenceSnapshot:
    id: Optional[int] = None
    repo_github_id: int = 0
    commit_sha: Optional[str] = None
    content_hash: str = ""
    readme_text: str = ""
    requirements_text: Optional[str] = None
    license_text: Optional[str] = None
    captured_at: Optional[str] = None

@dataclass
class EvidenceAnalysis:
    repo_github_id: int
    chinese_purpose: str  # 中文一句话用途
    scenarios: List[str] = field(default_factory=list)  # 适用场景
    satisfied_conditions: List[str] = field(default_factory=list)  # 明确满足的条件
    unsatisfied_conditions: List[str] = field(default_factory=list)  # 明确不满足的条件
    unknown_conditions: List[str] = field(default_factory=list)  # 证据未提及/未知的条件
    os_compatibility: Dict[str, str] = field(default_factory=lambda: {
        "Windows": "未知", "Linux": "未知", "macOS": "未知"
    })  # "支持" | "不支持" | "未知"
    gpu_requirement: str = "未知"  # "必须" | "可选" | "无需" | "未知"
    external_dependencies: List[str] = field(default_factory=list)  # 付费数据源/第三方API/必须服务
    license_summary: str = "未知"
    maintenance_status: str = "活跃"  # "活跃" | "稳定" | "维护放缓" | "已归档"
    evidence_snippets: List[str] = field(default_factory=list)  # 关键原文佐证
    model_used: Optional[str] = None
    analyzed_at: Optional[str] = None
