"""
用户收藏、多集合与评估管理模型
"""
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class Collection:
    id: Optional[int] = None
    name: str = "默认收藏夹"
    description: Optional[str] = None
    created_at: Optional[str] = None

@dataclass
class CollectionItem:
    collection_id: int
    repo_github_id: int
    evaluation_status: str = "待评估"  # 待评估 / 已试用 / 已采用 / 不适合
    user_notes: str = ""
    custom_tags: List[str] = field(default_factory=list)
    added_at: Optional[str] = None
    updated_at: Optional[str] = None
