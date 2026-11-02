"""
订阅与变更事件数据模型
"""
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class Subscription:
    id: Optional[int] = None
    name: str = ""
    query_str: str = ""
    domain: Optional[str] = None
    frequency_days: int = 7
    last_checked_at: Optional[str] = None
    last_pushed_watermark: Optional[str] = None  # 记录上次检索的最新 pushed_at 水位
    is_active: bool = True

@dataclass
class ChangeEvent:
    id: Optional[int] = None
    subscription_id: Optional[int] = None
    repo_github_id: int = 0
    repo_full_name: str = ""
    change_type: str = "新发现"  # "新发现" | "README功能变化" | "新版本" | "归档或转移" | "许可证变化"
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    detail: str = ""
    occurred_at: Optional[str] = None
    is_read: bool = False
