# 个人开源项目雷达 (Personal Open-Source Project Radar) `v0.3.0`

中文优先的个人开源项目发现与管理工具。用一句话描述需求，找到相关 GitHub 仓库，理解它们适合什么、缺什么、能否用于自己的项目，再按领域持续积累和更新。

👉 **在线体验地址 (GitHub Pages)**: [https://hantrleko.github.io/repo-radar/](https://hantrleko.github.io/repo-radar/)

---

## 🔥 V0.3.0 旗舰版升级 (五大深水区能力全量落地)

* **维度一：穿透 README 表面的仓库骨架与 Issue 真实避坑探针**
  * **目录树可复现性嗅探 (`RepoTreeInspector`)**：单次调用 GitHub Git Trees API 扫描全仓结构，自动鉴定是否具备 `examples/`、`Jupyter (.ipynb)`、`tests/`、`Docker` 及论文复现脚本（`.do` / `.R` / `data/`）。
  * **社区真实踩坑雷达 (`IssuePainPointScanner`)**：实时扫描未关闭 Open Issues，自动归类 `Windows兼容`、`安装编译`、`显存/算力`、`接口失效`、`维护警告` 五大痛点并附直达链接。
  * **本地环境画像碰撞 (`UserEnvProfile`)**：在设置中配置你的主力机（Windows/macOS/Linux、Python 版本、GPU 显存容量、是否排斥付费 API），每张卡片自动亮出红黄绿灯碰撞预警。

* **维度二：四大垂直领域“深水区专业探针”**
  * **金融与经济研究探针**：自动鉴别免费公网数据源 vs 付费商业终端（Wind/WRDS/Tushare Pro），识别双向固定效应 (TWFE)、双重差分 (DID)、工具变量 (IV/GMM)、聚类稳健标准误与 LaTeX 导出能力。
  * **量化交易探针**：自动核查回测引擎架构（事件驱动 vs 向量化）、是否包含手续费/滑点（`commission`/`slippage`）建模及防未来函数（`look-ahead bias`）声明。
  * **学术研究探针**：自动提取 `arXiv ID`、`DOI`，支持**一键复制标准 BibTeX 学术引用条目**。
  * **视频与图片创作探针**：严格拆分“代码开源协议”与“模型权重商用限制”（识别 `CC-BY-NC`/非商用限制），自动提取最低显存水位（如 `>= 24GB VRAM`）。

* **维度三：前端直连 BYOK 大模型双擎与强制原文引证核验**
  * 支持在前端配置 DeepSeek / OpenAI 兼容接口 / 本地 Ollama (`http://localhost:11434`)，密钥仅存本地浏览器。
  * **两阶段零幻觉机制**：第一阶段将复杂中文需求裂变为正交英文检索式；第二阶段提取 README 证据时强制要求模型返回一字不差的原文引文 (`exact_quote`)，前端校验器逐条与原文做子串核验，捏造引文 100% 自动拦截。

* **维度四：工作流拼装台进化为“脚手架代码生成器” (`ScaffoldGenerator`)**
  * 支持在各流水线槽位自由指派候选库或收藏库，实时预览并一键导出：
    1. 去重合并后的统一环境依赖清单 **`requirements.txt`**；
    2. 含分步数据交接骨架与文档注释的 **`pipeline_starter.py`**；
    3. 可直接在 VS Code / JupyterLab 打开运行的 **`workflow.ipynb` (Jupyter Notebook)**。

* **维度五：GitHub Secret Gist 跨端云同步 & Awesome 清单批量吞吐**
  * **Secret Gist 无后端云同步**：复用 GitHub Token 一键将收藏夹、评估笔记、订阅、工作流与环境画像加密备份至私密 Gist，多设备无缝漫游恢复。
  * **Awesome 清单批量入库**：输入任意 `awesome-xxx` 仓库地址或粘贴 Markdown，自动解析所有 GitHub 仓库并按四大领域归类批量导入本地目录库。

---

## 🚀 V0.2.0 特性回顾 (三大基础闭环)

* **方向 1：实时 README/依赖文件深挖与 Token 驱动的证据溯源引擎**
  * 深度拉取候选仓库的实时 README 原文及 `requirements.txt` / `pyproject.toml` / `package.json` 依赖清单。
  * 提取客观证据：Windows / Linux / macOS 运行环境佐证、GPU/显存需求 (必须/可选/无需)、商业付费 API Key (OpenAI / Anthropic / Tushare / CTP) 依赖识别。
  * 严格遵循“无证据则标为未知”原则，附带原文上下文切片（Evidence Snippets），零幻觉。
  * 本地 ETag 与 SHA256 内容哈希防抖缓存，避免重复消耗 GitHub API 配额。

* **方向 2：以仓找仓与研究工作流拼装台 (Workflow Composer)**
  * **以仓找仓**：输入 GitHub 仓库链接或点击项目卡片，分别检索“同生态位替代品”、“更轻量/零依赖版本”、“上下游互补模块”（如为数据获取库匹配计量分析与回测，为计量库匹配数据源与 LaTeX 导出）。
  * **研究工作流拼装台**：内置四大领域标准管线模板（宏观经济与金融计量、学术研读与论文复现、量化策略研发、科技视频创作），支持一键将候选项目装入数据获取、核心计算、可视化展示、报告导出等不同槽位，生成接口协作假设并导出完整 Markdown 流水线方案。

* **方向 3：订阅中心真实数据贯通与已收藏仓库增量 Diff 监控**
  * 浏览器端直连 GitHub API 增量巡检（点击“⚡ 立即增量巡检”）。
  * README SHA-256 哈希比对：仅当 README 发生实质功能变更时触发重新评估，单纯 Star 变化严格防抖、不产生噪音。
  * 状态机实时追踪：精准捕获项目“新版本提交”、“官方归档/只读锁定”及“README功能变更”。
  * 变更事件中心支持按类型快速筛选（全部 / 新版本 / README变化 / 归档转移）与单条标记已读。

---

## 一、核心定位与原则

本项目严格遵循 PRD 规范：
* **单用户、本地运行、浏览器访问**：基于 Streamlit 前端与 Python 独立服务层，数据存储在本地 SQLite (WAL + FTS5)，隐私与密钥不离机。
* **证据驱动决策**：无证据时一律标为“未知”，绝不凭空捏造兼容性或硬件支持；外部 README 输入隔离防注入。
* **业务闭环**：不仅是搜索框，而是打通“**描述需求 → 找候选 → 判断适用性 → 收藏分类 → 持续跟踪**”全流程。
* **平滑降级**：无 LLM API 或网络受限时，自动降级为规则抽取与原始信息展示，核心功能零依赖可用。

---

## 二、系统架构与模块边界

```
E:\AMP\repo-radar\
├── requirements.txt                   # 依赖列表
├── .env.example                       # 环境变量示例
├── data/                              # 本地 SQLite 数据与 WAL 文件
├── repo_radar/
│   ├── config.py                      # 全局配置与领域分类法 (四大领域 × 能力 × 形态)
│   ├── models/                        # 数据模型 (Repository, EvidenceSnapshot, etc.)
│   ├── storage/                       # 存储与全文索引 (SQLite 3, WAL, FTS5)
│   ├── sources/                       # GitHub REST API 接入 (限流退避 / ETag) 与种子加载
│   ├── query/                         # 需求意图解析与中英文双向查询扩展
│   ├── ranking/                       # 证据打分与三层分组 (完整方案 / 可组合模块 / 部分满足)
│   ├── analysis/                      # 证据化摘要与 LLM 适配器 (防提示词注入)
│   ├── subscriptions/                 # 持续更新引擎 (水位线控制 / README 内容哈希变更感知)
│   ├── benchmark/                     # 阶段 A：40 条真实中文需求评测基准
│   └── ui/                            # Streamlit Web 应用
│       ├── app.py                     # 主仪表盘
│       └── pages/                     # 找项目 / 分类目录 / 收藏评估 / 订阅中心 / 配置评测
```

---

## 三、快速启动

### 1. 安装依赖
```bash
cd E:\AMP\repo-radar
pip install -r requirements.txt
```

### 2. 启动 Web 界面
```bash
streamlit run repo_radar/ui/app.py
```
启动后浏览器自动打开 `http://localhost:8501`。

### 3. (可选) 配置 GitHub Token 与大语言模型
复制 `.env.example` 为 `.env` 或直接在 Web 界面【⚙️ 系统配置】页面进行配置：
* **GitHub Token**：可将 Search API 配额从 10次/分提升至 30次/分。
* **LLM 配置**：兼容 OpenAI / DeepSeek / 本地 Ollama。留空时系统默认启用离线规则引擎。

---

## 四、核心功能使用说明

### 1. 自然语言找项目
* 输入中文描述，如：`我想找能下载宏观数据、做面板回归、输出 LaTeX 表格的 Python 项目，最好能在 Windows 上运行。`
* 自动抽取核心目标、必需能力、环境（Windows/Linux）、语言偏好与排除条件。
* 结果分为三组呈现：
  * **🌟 较完整方案**：高度覆盖多项必需能力且维护活跃。
  * **🧩 可组合模块**：在单一关键能力上表现强劲的垂直库。
  * **🔍 部分满足需求**：部分命中或存在未知兼容性。
* 卡片清晰展示：中文用途、Windows/Linux/macOS 兼容性证据、GPU 需求、许可证及原文佐证。
* 支持多仓库横向 2–4 个一键比对。

### 2. 领域分类与人工优先标签
* 内置四大垂直领域：**学术研究**、**金融与经济研究**、**量化交易**、**视频与图片创作**。
* 支持横向能力标签（数据获取、清洗、估计、可视化等）与形态标签（工具库、完整应用、模板等）。
* **人工标签优先**：用户手动赋予的标签永久保留，自动更新程序不得覆盖人工决定。

### 3. 收藏夹与评估漏斗
* 支持按集合归类（如“默认收藏夹”、“宏观论文工具箱”）。
* 四阶评估状态追踪：`待评估` → `已试用` → `已采用` → `不适合`。
* 随时记录个人本地实测笔记与环境避坑指南。
* 支持一键导出当前集合为 **JSON** 或 **CSV**。

### 4. 持续更新与订阅中心
* 对关心的主题保存一次需求建立持续订阅。
* 采用 **pushed_at 水位线** 与 **README 内容哈希 (SHA256)** 增量监控。
* 仅在 README 实质内容变更时触发模型重新分析，星标微变不浪费配额。
* 变更事件细分为：`新发现`、`README功能变化`、`归档或转移`、`许可证变化`。
* 支持单独由 Windows 任务计划程序调用：
  ```bash
  python -m repo_radar.subscriptions.monitor
  ```
* **GitHub Actions 云端无人巡检**：仓库已配置 `.github/workflows/radar-monitor.yml`，每周一凌晨自动在 GitHub 云端执行扫描，并将最新变动直接发布至 [LATEST_RADAR_DIGEST.md](LATEST_RADAR_DIGEST.md) 与 Action 摘要中。

### 5. Phase A 评测基准运行器
在终端或设置页一键运行 40 条涵盖四大领域的真实中文需求基准测试：
```bash
python -m repo_radar.benchmark.evaluate
```
分领域透明展示 Top-1 命中率、Top-5 达标率与 P50/P95 检索延迟。代码提交时亦由 GitHub Actions 自动跑通回归测试。

---

## 五、首版安全与边界声明
1. 本地只读模式：默认只调取公开 API 与公开 README，绝不自动 clone、安装或执行未知第三方代码。
2. 提示注入防御：外部材料均在 `<untrusted_readme>` 标签中隔离渲染与调用。
3. 凭据隔离：API 密钥仅存储在本地配置中，绝不出机。
