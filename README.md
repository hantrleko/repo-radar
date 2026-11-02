# 个人开源项目雷达 (Personal Open-Source Project Radar)

中文优先的个人开源项目发现与管理工具。用一句话描述需求，找到相关 GitHub 仓库，理解它们适合什么、缺什么、能否用于自己的项目，再按领域持续积累和更新。

👉 **在线体验地址 (GitHub Pages)**: [https://hantrleko.github.io/repo-radar/](https://hantrleko.github.io/repo-radar/)

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
