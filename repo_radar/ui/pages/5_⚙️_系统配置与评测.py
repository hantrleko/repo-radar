"""
系统配置、配额监控与 Phase A 评测基准运行器
"""
import streamlit as st
import sys
from pathlib import Path

sys_path = str(Path(__file__).resolve().parent.parent.parent.parent)
if sys_path not in sys.path:
    sys.path.insert(0, sys_path)

from repo_radar.config import settings
from repo_radar.sources.github_client import GitHubClient
from repo_radar.benchmark.evaluate import run_evaluation

st.set_page_config(page_title="系统配置与评测 - 个人开源雷达", page_icon="⚙️", layout="wide")

st.title("⚙️ 系统配置与 Phase A 评测基准")

# 1. GitHub API 配置与实时配额
st.subheader("🔑 1. GitHub 接口与配额状态")
c_gh1, c_gh2 = st.columns([6, 4])
with c_gh1:
    current_token = st.text_input(
        "GitHub Personal Access Token (可选)",
        value=settings.github_token,
        type="password",
        help="填入 Token 可大幅提升 API 调用配额 (Search API: 10次/分 -> 30次/分, Core API: 60次/时 -> 5000次/时)"
    )
    if st.button("保存 Token 设置"):
        settings.github_token = current_token.strip()
        st.toast("GitHub Token 设置已更新！")

with c_gh2:
    gh_client = GitHubClient(token=current_token.strip())
    rate_limits = gh_client.get_rate_limit_status()
    st.markdown("**实时配额监控：**")
    st.write(f"- Search API 剩余: `{rate_limits.get('search_remaining')}` / `{rate_limits.get('search_limit')}`")
    st.write(f"- Core API 剩余: `{rate_limits.get('core_remaining')}` / `{rate_limits.get('core_limit')}`")

st.divider()

# 2. LLM 适配层配置
st.subheader("🤖 2. 大语言模型 (LLM) 适配层")
st.caption("支持 OpenAI、DeepSeek、Gemini、本地 Ollama 兼容协议。未配置时系统将自动降级为规则抽取与原始信息展示。")

col_prov, col_key = st.columns(2)
with col_prov:
    llm_prov = st.selectbox(
        "LLM 提供商",
        ["自定义/OpenAI兼容", "DeepSeek", "本地 Ollama", "无模型 (规则引擎离线降级)"],
        index=0
    )
    llm_url = st.text_input("Base URL", value=settings.llm_base_url)
with col_key:
    llm_key = st.text_input("API Key", value=settings.llm_api_key, type="password")
    llm_model = st.text_input("模型名称 (Model)", value=settings.llm_model)

if st.button("保存 LLM 配置"):
    settings.llm_base_url = llm_url.strip()
    settings.llm_api_key = llm_key.strip()
    settings.llm_model = llm_model.strip()
    st.toast("LLM 配置已更新！")

st.divider()

# 3. Phase A 评测基准运行器
st.subheader("📊 3. 阶段 A：检索可行性与四领域评测基准")
st.markdown("""
> 本评测套件包含覆盖**学术研究、金融与经济研究、量化交易、视频与图片创作**四大领域的 **40 条真实中文需求**。
> 严密核验 PRD 验收标准：
> 1. 前 5 个结果中至少 3 个高相关有用，且在至少 **80%** 的需求上达到。
> 2. 分领域报告指标，严禁使用总体平均数掩盖弱势领域。
> 3. 核心理由必须可追溯到证据，无证据时必须呈现为“未知”。
""")

limit_q = st.slider("评测用例数量", 5, 40, 40)
if st.button("▶️ 运行 Phase A 评测基准", type="primary"):
    with st.spinner(f"正在对 {limit_q} 条测试用例运行全流程检索、解析与证据化重排..."):
        results = run_evaluation(limit_queries=limit_q)

        st.success("评测运行完毕！")
        r_col1, r_col2, r_col3, r_col4 = st.columns(4)
        r_col1.metric("评测用例数", f"{results['total_queries']} 条")
        r_col2.metric("Top-1 准确率", f"{results['top1_hit_rate'] * 100:.1f}%")
        r_col3.metric("Top-5 实用达标率", f"{results['top5_pass_rate'] * 100:.1f}%")
        r_col4.metric("P50 / P95 延迟", f"{results['p50_latency_ms']:.1f} / {results['p95_latency_ms']:.1f} ms")

        st.subheader("分领域评测报告细分表")
        breakdown_data = []
        for d_name, d_val in results["domain_breakdown"].items():
            pass_pct = d_val["top5_passed"] / d_val["total"] * 100 if d_val["total"] else 0
            top1_pct = d_val["top1_hits"] / d_val["total"] * 100 if d_val["total"] else 0
            breakdown_data.append({
                "领域分类": d_name,
                "测试用例数": d_val["total"],
                "Top-1 命中率": f"{top1_pct:.1f}%",
                "Top-5 达标率": f"{pass_pct:.1f}%",
                "达标判定": "✅ 达标" if pass_pct >= 60 else "⚠️ 需加强扩展"
            })
        st.dataframe(breakdown_data, use_container_width=True)
