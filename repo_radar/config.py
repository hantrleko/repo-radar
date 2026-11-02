"""
全局配置与领域分类定义
"""
from dataclasses import dataclass, field
import os
from pathlib import Path
from typing import Dict, List

# 项目根目录
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_DB_PATH = os.getenv("RADAR_DB_PATH", str(DATA_DIR / "radar.db"))

# 默认四大领域及其子类目
DOMAINS_TAXONOMY: Dict[str, List[str]] = {
    "学术研究": [
        "文献发现",
        "参考文献管理",
        "PDF阅读与解析",
        "研究复现",
        "LaTeX工具与模版",
        "学术图表与演示",
    ],
    "金融与经济研究": [
        "宏观与金融数据",
        "因果推断",
        "面板计量",
        "资产定价",
        "公司金融",
        "财经文本分析",
    ],
    "量化交易": [
        "行情接入",
        "因子研究",
        "策略回测",
        "组合优化",
        "风险管理",
        "模拟交易",
    ],
    "视频与图片创作": [
        "图像生成与编辑",
        "视频剪辑",
        "代码动画",
        "AI配音与TTS",
        "自动字幕",
        "创作工作流编排",
    ],
}

# 横向能力标签
CAPABILITY_TAGS = [
    "数据获取",
    "数据清洗",
    "检索增强",
    "计量估计",
    "可视化呈现",
    "内容生成",
    "格式导出",
]

# 形态标签
MODALITY_TAGS = [
    "工具库",
    "完整应用",
    "脚手架模板",
    "实战教程",
    "论文复现代码",
    "资源清单",
]

# 评估状态枚举
EVALUATION_STATUSES = [
    "待评估",
    "已试用",
    "已采用",
    "不适合",
]

@dataclass
class Settings:
    db_path: str = DEFAULT_DB_PATH
    github_token: str = field(default_factory=lambda: os.getenv("GITHUB_TOKEN", ""))
    github_api_base: str = "https://api.github.com"
    request_timeout: int = 20
    max_candidates_per_search: int = 30
    
    # LLM 配置
    llm_provider: str = field(default_factory=lambda: os.getenv("LLM_PROVIDER", ""))
    llm_api_key: str = field(default_factory=lambda: os.getenv("LLM_API_KEY", ""))
    llm_base_url: str = field(default_factory=lambda: os.getenv("LLM_BASE_URL", "https://api.openai.com/v1"))
    llm_model: str = field(default_factory=lambda: os.getenv("LLM_MODEL", "gpt-4o-mini"))
    
    # 预算与速率控制
    max_search_queries_per_run: int = 5
    token_budget_per_summary: int = 1500

settings = Settings()
