"""
预置种子数据加载器 (覆盖学术研究、金融经济、量化交易、视频与图片创作四大领域)
"""
import hashlib
from typing import Dict, List
from repo_radar.models.repository import Repository, RepositoryTag
from repo_radar.models.evidence import EvidenceSnapshot, EvidenceAnalysis
from repo_radar.storage.repo_store import RepoStore

SEED_DATA: List[Dict] = [
    # ---- 1. 金融与经济研究 ----
    {
        "github_id": 10001,
        "full_name": "bashtage/linearmodels",
        "owner": "bashtage",
        "name": "linearmodels",
        "description": "Linear (econometric) models for Python, including Panel regression (fixed/random effects), Instrumental Variables (2SLS), and GMM.",
        "html_url": "https://github.com/bashtage/linearmodels",
        "stars": 1280,
        "language": "Python",
        "license_spdx": "NCSA",
        "pushed_at": "2026-10-15T08:30:00Z",
        "topics": ["econometrics", "panel-data", "instrumental-variables", "fixed-effects", "python", "statistics"],
        "domain": "金融与经济研究",
        "subcategory": "面板计量",
        "capability": "计量估计",
        "modality": "工具库",
        "chinese_purpose": "Python 经典计量经济学库，专攻面板数据固定效应/随机效应回归、工具变量 2SLS 与系统 GMM 估计，并支持导出清晰的汇总回归表格。",
        "scenarios": ["经济学宏观/微观实证论文", "企业面板数据分析", "内生性工具变量估计"],
        "satisfied": ["面板回归 (PanelOLS/RandomEffects)", "工具变量估计 (IV2SLS)", "双向固定效应", "聚类稳健标准误 (Cluster-robust)"],
        "unsatisfied": ["自带宏观数据下载功能 (需配合 AkShare/yfinance 使用)", "直接导出 LaTeX 表格文件 (需搭配 to_latex 转换)"],
        "unknown": ["GPU加速支持 (未提及，纯 CPU 运行)"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "无需",
        "external_deps": ["numpy", "scipy", "pandas", "statsmodels"],
        "readme_excerpt": """# Linear Models
Linear econometric models for Python.
## Features
- Panel models: Fixed effects, Random effects, Between models, First difference
- Instrumental Variable models: IV2SLS, IVGMM, IVLIML
- Asset pricing: Fama-MacBeth, GMM factor models
Works on Windows, Linux, and macOS via pip/conda."""
    },
    {
        "github_id": 10002,
        "full_name": "akfamily/akshare",
        "owner": "akfamily",
        "name": "akshare",
        "description": "AKShare is an elegant and simple financial data interface library for Python, built for human beings! 开源财经数据接口库",
        "html_url": "https://github.com/akfamily/akshare",
        "stars": 16500,
        "language": "Python",
        "license_spdx": "MIT",
        "pushed_at": "2026-10-30T14:20:00Z",
        "topics": ["finance", "stock", "macro-data", "data-scraping", "quantitative-trading", "python"],
        "domain": "金融与经济研究",
        "subcategory": "宏观与金融数据",
        "capability": "数据获取",
        "modality": "工具库",
        "chinese_purpose": "中文金融与宏观经济数据获取全能接口库，涵盖 A 股、港美股、债券、期货、期权、宏观经济统计局数据及大宗商品数据。",
        "scenarios": ["宏观经济时间序列下载", "中国金融市场历史行情提取", "实证学术论文数据底座"],
        "satisfied": ["免费公开宏观数据接口 (中国CPI/GDP/社融/货币供应)", "股票行情历史数据", "跨平台免额外驱动"],
        "unsatisfied": ["计量回归计算 (需传入 statsmodels/linearmodels)", "高频 Tick 实盘撮合"],
        "unknown": ["部分特定网页爬虫反爬稳定性 (需关注上游接口维护)"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "无需",
        "external_deps": ["requests", "pandas", "beautifulsoup4"],
        "readme_excerpt": """# AKShare
AKShare is an elegant and simple financial data interface library for Python.
Supports: Macroeconomic data (China & Global), A-share, US-share, HK-share, Futures, Bonds, FX.
Pure Python, pip install akshare. Cross-platform."""
    },
    {
        "github_id": 10003,
        "full_name": "py-why/dowhy",
        "owner": "py-why",
        "name": "dowhy",
        "description": "DoWhy is a Python library for causal inference that supports explicit modeling and testing of causal assumptions.",
        "html_url": "https://github.com/py-why/dowhy",
        "stars": 7400,
        "language": "Python",
        "license_spdx": "MIT",
        "pushed_at": "2026-09-28T10:00:00Z",
        "topics": ["causal-inference", "machine-learning", "econometrics", "causality", "python"],
        "domain": "金融与经济研究",
        "subcategory": "因果推断",
        "capability": "计量估计",
        "modality": "工具库",
        "chinese_purpose": "微软与 PyWhy 开源的因果推断统一建模库，提供因果图模型、因果效应识别、断点回归/倾向得分估计与严谨的稳健性反驳检验。",
        "scenarios": ["政策评估与断点回归分析", "因果效应估计与混杂控制", "稳健性假说反驳测试 (Refutation Tests)"],
        "satisfied": ["四步标准因果推断范式", "倾向得分匹配与双重差分 (DID)", "安慰剂检验与随机反驳"],
        "unsatisfied": ["金融高频实时行情处理", "自动爬取未经清洗的宏观数据"],
        "unknown": ["超大规模亿级样本集群分布式运行性能"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "可选",
        "external_deps": ["numpy", "scipy", "networkx", "sympy"],
        "readme_excerpt": """# DoWhy: A library for causal inference
Four steps of causal inference: Model, Identify, Estimate, Refute.
Cross platform Python library."""
    },
    {
        "github_id": 10004,
        "full_name": "statsmodels/statsmodels",
        "owner": "statsmodels",
        "name": "statsmodels",
        "description": "Statsmodels: statistical modeling and econometrics in Python (OLS, Time Series ARMA/VECM, GMM, Hypothesis Tests).",
        "html_url": "https://github.com/statsmodels/statsmodels",
        "stars": 9800,
        "language": "Python",
        "license_spdx": "BSD-3-Clause",
        "pushed_at": "2026-10-22T11:00:00Z",
        "topics": ["statistics", "econometrics", "time-series", "ols", "vecm", "python"],
        "domain": "金融与经济研究",
        "subcategory": "宏观与金融数据",
        "capability": "计量估计",
        "modality": "工具库",
        "chinese_purpose": "Python 科学计算生态的核心统计与计量模型库，包含 OLS 回归、时间序列 ARIMA/VAR/VECM 协整检验、假说检验及资产定价因子回归。",
        "scenarios": ["时间序列协整与VECM分析", "事件研究法超额收益计算", "统计假设检验与残差诊断"],
        "satisfied": ["协整检验与误差修正模型 VECM", "丰富的假设检验与统计诊断", "支持输出 summary 表格并导出 LaTeX"],
        "unsatisfied": ["开箱即用的高频订单流撮合", "内置在线行情下载接口"],
        "unknown": ["部分超大矩阵在极度受限内存上的溢出控制"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "无需",
        "external_deps": ["scipy", "pandas", "patsy"],
        "readme_excerpt": """# statsmodels
Statistical modeling and econometrics in Python.
OLS, GLM, Time Series Analysis (VAR, VECM, ARIMA), Hypothesis tests.
Supports to_latex() on summary tables."""
    },
    {
        "github_id": 10005,
        "full_name": "ranaroussi/yfinance",
        "owner": "ranaroussi",
        "name": "yfinance",
        "description": "Download market data from Yahoo! Finance's API. A Python library for historical prices, fundamentals, and financial statements.",
        "html_url": "https://github.com/ranaroussi/yfinance",
        "stars": 15800,
        "language": "Python",
        "license_spdx": "Apache-2.0",
        "pushed_at": "2026-10-25T15:00:00Z",
        "topics": ["finance", "yahoo-finance", "stock-quotes", "historical-data", "python"],
        "domain": "金融与经济研究",
        "subcategory": "宏观与金融数据",
        "capability": "数据获取",
        "modality": "工具库",
        "chinese_purpose": "全球股票与宏观资产历史数据抓取利器，获取美股/全球指数日线、上市公司财务报表、财报分析与基本面指标。",
        "scenarios": ["全球跨国资产定价数据提取", "上市公司财务报表与财报分析", "历史分红与拆股调整价格序列计算"],
        "satisfied": ["全球股票/外汇/加密资产历史行情", "资产负债表/利润表/现金流量表提取", "无须注册付费即装即用"],
        "unsatisfied": ["国内期货特定 CTP 协议", "实时 L2 逐笔委托高频行情"],
        "unknown": ["雅虎上游接口偶发限流策略变更风险"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "无需",
        "external_deps": ["requests", "pandas", "multitasking"],
        "readme_excerpt": """# yfinance
Download market data from Yahoo! Finance's API.
Supports historical stock prices, balance sheet, income statement."""
    },

    # ---- 2. 学术研究 ----
    {
        "github_id": 20001,
        "full_name": "typst/typst",
        "owner": "typst",
        "name": "typst",
        "description": "A new markup-based typesetting system that is designed to be as powerful as LaTeX while being much easier to learn and use.",
        "html_url": "https://github.com/typst/typst",
        "stars": 38000,
        "language": "Rust",
        "license_spdx": "Apache-2.0",
        "pushed_at": "2026-10-31T18:00:00Z",
        "topics": ["typesetting", "latex", "pdf", "cli", "rust", "document-generation"],
        "domain": "学术研究",
        "subcategory": "LaTeX工具与模版",
        "capability": "格式导出",
        "modality": "完整应用",
        "chinese_purpose": "新一代基于标记语言的现代学术排版系统，旨在具备 LaTeX 级强大的数学公式与文献管理能力，同时毫秒级实时编译预览。",
        "scenarios": ["学术论文快速排版与双栏排版", "课程作业报告与幻灯片", "精美学术简历与技术文档"],
        "satisfied": ["毫秒级增量编译与即时预览", "内置强大数学公式语法", "开箱即用的参考文献 BibTeX 导入与引用样式", "单二进制文件直接运行"],
        "unsatisfied": ["部分极端陈旧的经典 LaTeX 宏包直接导入 (需使用 Typst 现代包替代)"],
        "unknown": ["国内某些特定中文期刊强制投稿 .tex 文件的兼容性"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "无需",
        "external_deps": ["无外部重型依赖 (单个可执行文件)"],
        "readme_excerpt": """# Typst
Typst is a new markup-based typesetting system that is designed to be as powerful as LaTeX.
Fast compilation, readable syntax, pure modern CLI."""
    },
    {
        "github_id": 20002,
        "full_name": "pymupdf/PyMuPDF",
        "owner": "pymupdf",
        "name": "PyMuPDF",
        "description": "PyMuPDF is a high performance Python library for data extraction, analysis, conversion & manipulation of PDF (and other) documents.",
        "html_url": "https://github.com/pymupdf/PyMuPDF",
        "stars": 6100,
        "language": "C",
        "license_spdx": "AGPL-3.0",
        "pushed_at": "2026-10-25T11:00:00Z",
        "topics": ["pdf", "pdf-parser", "ocr", "python", "data-extraction"],
        "domain": "学术研究",
        "subcategory": "PDF阅读与解析",
        "capability": "数据清洗",
        "modality": "工具库",
        "chinese_purpose": "极速 Python PDF 文档解析与文本/表格/图像抽取工具库，广泛用于学术论文全文提取、文献检索与结构化整理。",
        "scenarios": ["学术论文全文批量提取与元数据解析", "PDF 转换 Markdown/纯文本", "大模型 RAG 知识库切片预处理"],
        "satisfied": ["提取 PDF 纯文本及精确坐标", "提取论文中的矢量图与插图", "Windows/Mac/Linux 预编译 Wheel 即装即用"],
        "unsatisfied": ["扫描版模糊 PDF 的高精度无损版面还原 (需外挂 OCR 引擎)"],
        "unknown": ["部分极度加密签署 PDF 文件的解密能力"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "无需",
        "external_deps": ["MuPDF C 库 (内嵌)"],
        "readme_excerpt": """# PyMuPDF
High performance Python library for PDF extraction and manipulation. Fast, lightweight, cross-platform."""
    },
    {
        "github_id": 20003,
        "full_name": "zotero/zotero",
        "owner": "zotero",
        "name": "zotero",
        "description": "Zotero is a free, easy-to-use tool to help you collect, organize, annotate, cite, and share research.",
        "html_url": "https://github.com/zotero/zotero",
        "stars": 11000,
        "language": "JavaScript",
        "license_spdx": "AGPL-3.0",
        "pushed_at": "2026-10-29T10:00:00Z",
        "topics": ["research", "reference-manager", "zotero", "bibliography", "citation"],
        "domain": "学术研究",
        "subcategory": "参考文献管理",
        "capability": "检索增强",
        "modality": "完整应用",
        "chinese_purpose": "开源学术文献收集与管理标杆客户端，支持元数据抓取、PDF 全文标注、BibTeX 导出与跨平台多设备同步。",
        "scenarios": ["学术文献库统一分类管理", "论文写作实时生成引用文献", "PDF 高亮标注与双向笔记同步"],
        "satisfied": ["浏览器一键捕获论文元数据", "导出标准 BibTeX/CSL 格式", "Windows/macOS/Linux 原生图形客户端"],
        "unsatisfied": ["无图形界面的极简纯 Python CLI 独立运行"],
        "unknown": ["非官方第三方云盘 WebDAV 同步插件长效稳定性"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "无需",
        "external_deps": ["Electron/NodeJS"],
        "readme_excerpt": """# Zotero
Zotero is a free, easy-to-use tool to help you collect, organize, annotate, cite, and share research."""
    },
    {
        "github_id": 20004,
        "full_name": "matplotlib/matplotlib",
        "owner": "matplotlib",
        "name": "matplotlib",
        "description": "matplotlib: plotting with Python. Publication quality figures, lines, bars, heatmaps, and LaTeX text rendering.",
        "html_url": "https://github.com/matplotlib/matplotlib",
        "stars": 20500,
        "language": "Python",
        "license_spdx": "PSF",
        "pushed_at": "2026-10-26T17:00:00Z",
        "topics": ["visualization", "plotting", "chart", "figure", "latex", "python"],
        "domain": "学术研究",
        "subcategory": "学术图表与演示",
        "capability": "可视化呈现",
        "modality": "工具库",
        "chinese_purpose": "Python 科学出版级制图基石，绘制顶刊品质的折线图、散点图、热力图，并深度支持 LaTeX 数学公式渲染与高分辨率矢量图导出。",
        "scenarios": ["学术论文顶刊配图排版", "计量回归系数森林图与置信区间绘制", "实验数据多子图网格拼接"],
        "satisfied": ["支持直接渲染 LaTeX 公式文本", "支持导出 600DPI TIFF, PDF, EPS 矢量图", "高自由度定制图例、坐标轴与色条"],
        "unsatisfied": ["非代码拖拽的傻瓜式前端交互编辑"],
        "unknown": ["极度海量十亿级别点阵实时 120fps 渲染 (建议用 Datashader)"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "无需",
        "external_deps": ["numpy", "pillow"],
        "readme_excerpt": """# Matplotlib
Publication quality figures in Python.
Supports LaTeX rendering via rcParams['text.usetex'] = True."""
    },

    # ---- 3. 量化交易 ----
    {
        "github_id": 30001,
        "full_name": "vnpy/vnpy",
        "owner": "vnpy",
        "name": "vnpy",
        "description": "Python-based open source quantitative trading system development framework. 基于Python的开源量化交易平台开发框架",
        "html_url": "https://github.com/vnpy/vnpy",
        "stars": 24500,
        "language": "Python",
        "license_spdx": "MIT",
        "pushed_at": "2026-10-20T12:00:00Z",
        "topics": ["quantitative-trading", "algo-trading", "backtesting", "ctp", "futures", "python"],
        "domain": "量化交易",
        "subcategory": "策略回测",
        "capability": "计量估计",
        "modality": "完整应用",
        "chinese_purpose": "国内成熟的 Python 开源量化交易平台框架，包含完整 CTA 策略回测引擎、多周期行情记录及实盘网关对接体系。",
        "scenarios": ["CTA 趋势策略与网格交易回测", "国内期货 CTP 实盘接入", "策略参数网格/遗传算法寻优"],
        "satisfied": ["事件驱动回测引擎", "完整的图形界面 (PySide6)", "支持国内期货 CTP 接口", "滑点与手续费精确设定"],
        "unsatisfied": ["超低延迟 C++ 纳秒级高频做市系统", "无门槛直接交易美股免配置"],
        "unknown": ["部分境外冷门加密货币交易所 API 适配完整性"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "部分支持 (CTP驱动限制)"},
        "gpu_requirement": "无需",
        "external_deps": ["PySide6", "peewee", "numpy"],
        "readme_excerpt": """# VeighNa (vn.py)
VeighNa is an open-source quantitative trading framework developed in Python.
Features: CTA Backtesting, Real-time execution via CTP, Desktop GUI."""
    },
    {
        "github_id": 30002,
        "full_name": "microsoft/qlib",
        "owner": "microsoft",
        "name": "qlib",
        "description": "Qlib is an AI-oriented quantitative investment platform that aims to realize the potential, empower the research, and create the value of AI technologies in finance.",
        "html_url": "https://github.com/microsoft/qlib",
        "stars": 16800,
        "language": "Python",
        "license_spdx": "MIT",
        "pushed_at": "2026-10-18T09:00:00Z",
        "topics": ["machine-learning", "quantitative-finance", "alpha-factors", "deep-learning", "investment", "python"],
        "domain": "量化交易",
        "subcategory": "因子研究",
        "capability": "内容生成",
        "modality": "完整应用",
        "chinese_purpose": "微软开源的 AI 驱动量化投资研发平台，涵盖高吞吐因子表达式引擎、LightGBM/Transformer 等多模型 Alpha 挖掘与回测评估。",
        "scenarios": ["海量量化 Alpha 因子自动计算与挖掘", "机器学习时序选股模型训练", "投资组合权重优化与风险分解"],
        "satisfied": ["C++ 加速的高效时序数据存储与回放", "内置经典基准模型 (GBDT/LSTM/Transformer)", "标准化 IC/RankIC 回测评价报告"],
        "unsatisfied": ["直连交易所做市撮合", "极简 10 行代码新手小白零基础脚本"],
        "unknown": ["苹果 Apple Silicon MPS 原生加速完备性 (CUDA 优先)"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "可选",
        "external_deps": ["PyTorch", "LightGBM", "numpy", "pandas"],
        "readme_excerpt": """# Qlib
AI-oriented quantitative investment platform by Microsoft.
Covers data preparation, model training, factor evaluation and backtesting."""
    },
    {
        "github_id": 30003,
        "full_name": "ccxt/ccxt",
        "owner": "ccxt",
        "name": "ccxt",
        "description": "A JavaScript / Python / PHP cryptocurrency trading library with support for more than 100 exchanges.",
        "html_url": "https://github.com/ccxt/ccxt",
        "stars": 34000,
        "language": "TypeScript",
        "license_spdx": "MIT",
        "pushed_at": "2026-11-01T04:00:00Z",
        "topics": ["crypto", "trading", "exchange-api", "orderbook", "market-data"],
        "domain": "量化交易",
        "subcategory": "行情接入",
        "capability": "数据获取",
        "modality": "工具库",
        "chinese_purpose": "全球多交易所加密货币行情接入与交易统一接口，抹平数百家交易所 API 差异，提供标准统一的 Orderbook 深度和 K 线调用。",
        "scenarios": ["多交易所实时价格与深度数据采集", "跨平台统计套利策略开发", "统一量化交易执行网关"],
        "satisfied": ["统一的多交易所 REST 与 WebSocket 行情接口", "内置速率限制与请求限流保护", "原生支持 Python / TypeScript"],
        "unsatisfied": ["国内商品期货 CTP 协议", "传统 A 股券商集中交易系统柜台接入"],
        "unknown": ["特定交易所小币种极端行情流动性穿透情况"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "无需",
        "external_deps": ["aiohttp", "requests"],
        "readme_excerpt": """# CCXT – CryptoCurrency eXchange Trading Library
Unified API for over 100 cryptocurrency exchanges. Supports Python and JS."""
    },
    {
        "github_id": 30004,
        "full_name": "mementum/backtrader",
        "owner": "mementum",
        "name": "backtrader",
        "description": "Python Backtesting library for trading strategies. Clean, lightweight, self-contained, with custom commission and slippage.",
        "html_url": "https://github.com/mementum/backtrader",
        "stars": 14200,
        "language": "Python",
        "license_spdx": "GPL-3.0",
        "pushed_at": "2026-08-10T12:00:00Z",
        "topics": ["backtesting", "trading", "indicators", "python", "finance"],
        "domain": "量化交易",
        "subcategory": "策略回测",
        "capability": "计量估计",
        "modality": "工具库",
        "chinese_purpose": "轻量自包含的经典 Python 策略回测库，支持多周期数据混部、自定义佣金与滑点模型，无繁重分布式中间件依赖。",
        "scenarios": ["股票与期货技术指标策略回测", "自定义交易滑点与佣金费用模型测试", "参数网格搜索与策略收益可视化"],
        "satisfied": ["纯 Python 无重型分布式数据库依赖", "自定义手续费与滑点 (Slippage)", "内置数十种常用技术指标与制图功能"],
        "unsatisfied": ["原作者近年维护放缓 (社区常有活跃 fork 分支)"],
        "unknown": ["纳秒级超高频高并发订单撮合吞吐量"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "无需",
        "external_deps": ["matplotlib"],
        "readme_excerpt": """# backtrader
Python Backtesting library for trading strategies.
Lightweight, pure Python, supports custom commissions and slippage."""
    },

    # ---- 4. 视频与图片创作 ----
    {
        "github_id": 40001,
        "full_name": "ManimCommunity/manim",
        "owner": "ManimCommunity",
        "name": "manim",
        "description": "A community-maintained Python framework for creating mathematical and technical animations.",
        "html_url": "https://github.com/ManimCommunity/manim",
        "stars": 31000,
        "language": "Python",
        "license_spdx": "MIT",
        "pushed_at": "2026-10-28T16:00:00Z",
        "topics": ["animation", "python", "mathematics", "visualization", "video", "cairo"],
        "domain": "视频与图片创作",
        "subcategory": "代码动画",
        "capability": "可视化呈现",
        "modality": "工具库",
        "chinese_purpose": "3Blue1Brown 风格的数学与工程算法可视化动画引擎（社区维护版），用精炼的 Python 代码绘制极具质感的高清讲解视频。",
        "scenarios": ["经济学/数学定理与算法推导动画", "技术方案演示与教学视频制作", "动态图表与几何变换演示"],
        "satisfied": ["高质量 LaTeX 公式无缝渲染", "矢量图形平滑补间动画", "支持直接导出 4K MP4/GIF"],
        "unsatisfied": ["非代码所见即所得拖拽 GUI 编辑", "真实人物自然语言语音配音"],
        "unknown": ["极低配置无独立显卡机器超长动画实时预览帧率"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "可选",
        "external_deps": ["ffmpeg", "cairo", "numpy"],
        "readme_excerpt": """# Manim Community Edition
A community-maintained Python framework for creating mathematical animations.
Pip install manim. Requires FFmpeg. Cross-platform."""
    },
    {
        "github_id": 40002,
        "full_name": "openai/whisper",
        "owner": "openai",
        "name": "whisper",
        "description": "Robust Speech Recognition via Large-Scale Weak Supervision",
        "html_url": "https://github.com/openai/whisper",
        "stars": 75000,
        "language": "Python",
        "license_spdx": "MIT",
        "pushed_at": "2026-09-12T15:00:00Z",
        "topics": ["speech-recognition", "asr", "audio", "subtitles", "python", "pytorch"],
        "domain": "视频与图片创作",
        "subcategory": "自动字幕",
        "capability": "数据清洗",
        "modality": "工具库",
        "chinese_purpose": "OpenAI 开源的高鲁棒性多语言语音识别模型，可直接将中英文音视频高精度转录为带精确时间轴的 SRT/VTT 字幕文件。",
        "scenarios": ["视频自动提取中英文字幕", "学术讲座与访谈录音转文字", "多语言字幕自动翻译生成"],
        "satisfied": ["多语言语音转文本与自动翻译", "直接导出精确时间戳 .srt/.vtt 字幕", "本地离线私密运行，无数据泄露风险"],
        "unsatisfied": ["自动在视频画面中添加特效花字", "微调语音音色与声音克隆"],
        "unknown": ["高嘈杂工业噪声环境下小语种方言识别准确率"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "可选 (CPU 可运行，CUDA 大幅加速)",
        "external_deps": ["PyTorch", "ffmpeg-python"],
        "readme_excerpt": """# Whisper
Robust Speech Recognition via Large-Scale Weak Supervision.
Outputs .srt, .vtt, .txt subtitles. Supports Windows/Linux/macOS."""
    },
    {
        "github_id": 40003,
        "full_name": "comfyanonymous/ComfyUI",
        "owner": "comfyanonymous",
        "name": "ComfyUI",
        "description": "The most powerful and modular stable diffusion GUI and backend. Node-based workflow, efficient VRAM usage.",
        "html_url": "https://github.com/comfyanonymous/ComfyUI",
        "stars": 58000,
        "language": "Python",
        "license_spdx": "GPL-3.0",
        "pushed_at": "2026-11-01T20:00:00Z",
        "topics": ["stable-diffusion", "comfyui", "image-generation", "node-graph", "ai-art"],
        "domain": "视频与图片创作",
        "subcategory": "图像生成与编辑",
        "capability": "内容生成",
        "modality": "完整应用",
        "chinese_purpose": "模块化、节点式 Stable Diffusion 与 Flux 图像生成引擎，极致的显存优化调度与高度可复现的生成工作流。",
        "scenarios": ["复杂 AI 艺术图像生成与精细重绘", "长篇工作流节点编排与参数复用", "批量提示词工业化自动化渲染"],
        "satisfied": ["节点图形化 Web 界面", "精细显存管理 (小显存自动分段加载)", "本地独立运行，支持 Windows 离线包"],
        "unsatisfied": ["纯自然语言自动一键合成视频配音"],
        "unknown": ["部分冷门第三方自定义节点的兼容性冲突"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "必须 (支持 NVIDIA CUDA 及 Apple MPS)",
        "external_deps": ["PyTorch", "torchvision", "Pillow"],
        "readme_excerpt": """# ComfyUI
The most powerful and modular stable diffusion GUI and backend.
Node-based workflow. Runs on Windows, Linux, and macOS."""
    },
    {
        "github_id": 40004,
        "full_name": "Zulko/moviepy",
        "owner": "Zulko",
        "name": "moviepy",
        "description": "Video editing with Python: cut, concatenations, title insertions, video compositing, and custom effects.",
        "html_url": "https://github.com/Zulko/moviepy",
        "stars": 13200,
        "language": "Python",
        "license_spdx": "MIT",
        "pushed_at": "2026-09-18T10:00:00Z",
        "topics": ["video-editing", "python", "multimedia", "ffmpeg", "clips"],
        "domain": "视频与图片创作",
        "subcategory": "视频剪辑",
        "capability": "内容生成",
        "modality": "工具库",
        "chinese_purpose": "Python 编程视频剪辑与后期合成库，支持命令行切片、多轨道合成、标题插入与自定义特效渲染，无需启动厚重商业软件。",
        "scenarios": ["短视频批量程序化裁剪与合成", "自动化生成带水印与片尾的技术演示片", "视频音轨提取与混合剪辑"],
        "satisfied": ["视频切片、拼接与旋转", "音频轨道混合与音量淡入淡出", "基于 Python 代码批量处理，免 GUI 运行"],
        "unsatisfied": ["专业非编软件的实时多轨 4K 拖拽剪辑体验"],
        "unknown": ["极高帧率 120fps 慢动作插帧算法原生效能"],
        "os_compatibility": {"Windows": "支持", "Linux": "支持", "macOS": "支持"},
        "gpu_requirement": "无需",
        "external_deps": ["imageio", "ffmpeg", "numpy"],
        "readme_excerpt": """# MoviePy
Video editing with Python.
Supports cuts, concatenations, title insertions, audio manipulation."""
    }
]

def load_seed_data(repo_store: RepoStore) -> int:
    """将高质量精选种子仓库与证据分析导入数据库"""
    count = 0
    for item in SEED_DATA:
        repo = Repository(
            github_id=item["github_id"],
            full_name=item["full_name"],
            owner=item["owner"],
            name=item["name"],
            description=item["description"],
            html_url=item["html_url"],
            stars=item["stars"],
            language=item["language"],
            license_spdx=item["license_spdx"],
            pushed_at=item["pushed_at"],
            topics=item["topics"]
        )
        repo_store.save_repository(repo)

        tag = RepositoryTag(
            repo_github_id=repo.github_id,
            domain=item["domain"],
            subcategory=item["subcategory"],
            capability=item["capability"],
            modality=item["modality"],
            is_manual=True
        )
        repo_store.save_tag(tag)

        content_hash = hashlib.sha256(item["readme_excerpt"].encode("utf-8")).hexdigest()
        snapshot = EvidenceSnapshot(
            repo_github_id=repo.github_id,
            content_hash=content_hash,
            readme_text=item["readme_excerpt"],
            license_text=item["license_spdx"]
        )
        repo_store.save_evidence_snapshot(snapshot)

        analysis = EvidenceAnalysis(
            repo_github_id=repo.github_id,
            chinese_purpose=item["chinese_purpose"],
            scenarios=item["scenarios"],
            satisfied_conditions=item["satisfied"],
            unsatisfied_conditions=item["unsatisfied"],
            unknown_conditions=item["unknown"],
            os_compatibility=item["os_compatibility"],
            gpu_requirement=item["gpu_requirement"],
            external_dependencies=item["external_deps"],
            license_summary=item["license_spdx"] or "未知",
            evidence_snippets=[item["readme_excerpt"][:180]]
        )
        repo_store.save_evidence_analysis(analysis)
        count += 1
    return count
