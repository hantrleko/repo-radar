"""
仓库与分类数据结构
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

@dataclass
class Repository:
    github_id: int
    full_name: str
    owner: str
    name: str
    description: Optional[str] = None
    html_url: str = ""
    default_branch: str = "main"
    stars: int = 0
    forks: int = 0
    open_issues: int = 0
    language: Optional[str] = None
    license_spdx: Optional[str] = None
    pushed_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    is_archived: bool = False
    is_fork: bool = False
    topics: List[str] = field(default_factory=list)
    homepage: Optional[str] = None
    last_scraped_at: Optional[str] = None
    scrape_error: Optional[str] = None

@dataclass
class RepositoryTag:
    repo_github_id: int
    domain: str
    subcategory: Optional[str] = None
    capability: Optional[str] = None
    modality: Optional[str] = None
    is_manual: bool = False  # 人工标签优先级高于自动推断
