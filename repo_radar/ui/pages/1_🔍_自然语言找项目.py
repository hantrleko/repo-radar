"""
自然语言找项目 & 适用性证据化评估卡片
"""
import streamlit as st
import sys
from pathlib import Path

sys_path = str(Path(__file__).resolve().parent.parent.parent.parent)
if sys_path not in sys.path:
    sys.path.insert(0, sys_path)

from repo_radar.query.parser import QueryParser
from repo_radar.query.expander import QueryExpander
from repo_radar.analysis.summarizer import EvidenceSummarizer
from repo_radar.analysis.llm_adapter import LLMAdapter
from repo_radar.ranking.triager import Triager
from repo_radar.storage.repo_store import RepoStore
from repo_radar.storage.collection_store import CollectionStore
from repo_radar.sources.github_client import GitHubClient, GitHubAPIError
from repo_radar.models.collection import CollectionItem

st.set_page_config(page_title="自然语言找项目 - 个人开源雷达", page_icon="🔍", layout="wide")

store = RepoStore()
col_store = CollectionStore()
parser = QueryParser()
expander = QueryExpander()
summarizer = EvidenceSummarizer()
triager = Triager()
gh_client = GitHubClient()

st.title("🔍 自然语言找项目")
st.caption("用一句话描述你的研究或工程需求，由雷达自动抽取约束、扩充中英检索、提取证据并按适用性分层归组。")

# 预设需求快捷选项
sample_queries = [
    "我想找能下载宏观数据、做面板回归、输出 LaTeX 表格的 Python 项目，最好能在 Windows 上运行。",
    "找能解析学术论文PDF、抽取表格和公式并转成Markdown的Python库，不要付费OCR服务。",
    "支持国内商品期货CTP接口、带GUI界面并能进行CTA策略回测的开源交易框架。",
    "用代码制作3Blue1Brown风格的数学和技术推导高清动画的Python库。",
]

selected_sample = st.selectbox("💡 快速体验样例需求：", ["-- 选择预设需求或在下方直接输入 --"] + sample_queries)

default_text = selected_sample if selected_sample != "-- 选择预设需求或在下方直接输入 --" else ""
user_input = st.text_area(
    "输入你的中文需求：",
    value=default_text,
    placeholder="例如：找支持双重差分DID、能绘制事件研究法动态图并输出论文表格的计量经济学工具...",
    height=80
)

col_btn, col_mode, col_budget = st.columns([2, 2, 2])
with col_btn:
    search_clicked = st.button("🚀 结构化解析并查找", type="primary", use_container_width=True)
with col_mode:
    search_source = st.radio("搜索数据源", ["本地已收录 + 实时GitHub", "仅本地离线索引 (快速)"], horizontal=True)
with col_budget:
    candidate_limit = st.slider("最大候选抓取数量", 5, 25, 10)

if "parsed_query" not in st.session_state:
    st.session_state["parsed_query"] = None
if "search_results" not in st.session_state:
    st.session_state["search_results"] = None
if "compare_list" not in st.session_state:
    st.session_state["compare_list"] = []

if search_clicked and user_input.strip():
    with st.spinner("正在解析需求并扩充中英文检索词..."):
        parsed = parser.parse(user_input.strip())
        expanded = expander.expand(parsed)
        st.session_state["parsed_query"] = parsed

    # 结构化条件预览与编辑
    st.subheader("🎯 抽取的需求结构与硬性约束")
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f"**核心目标**: `{parsed.target or '全部'}`")
        st.markdown(f"**编程语言**: `{', '.join(parsed.target_languages) or '不限'}`")
    with c2:
        st.markdown(f"**必需能力**: `{', '.join(parsed.required_capabilities) or '未指定'}`")
    with c3:
        st.markdown(f"**运行环境**: `{', '.join(parsed.environments) or '不限'}`")
    with c4:
        st.markdown(f"**排除条件**: `{', '.join(parsed.exclusions) or '无'}`")

    st.caption(f"生成的 GitHub API 检索词：`{'` | `'.join(expanded)}`")

    # 候选发现与去重
    with st.spinner("正在检索候选项目并抓取证据材料..."):
        candidates_map = {}

        # 1. 本地 FTS 候选
        local_repos = store.search_local_fts(f"{parsed.target} {' '.join(expanded)}", limit=candidate_limit)
        for r in local_repos:
            candidates_map[r.github_id] = r

        # 2. 如果开启了在线 GitHub 搜索
        if "实时GitHub" in search_source:
            for q_str in expanded[:2]:
                try:
                    remote_repos = gh_client.search_repositories(q_str, per_page=5)
                    for r in remote_repos:
                        if r.github_id not in candidates_map:
                            store.save_repository(r)
                            candidates_map[r.github_id] = r
                except GitHubAPIError as e:
                    st.warning(f"GitHub API 提示: {e}")
                    break

        candidate_pairs = []
        for gid, repo in list(candidates_map.items())[:candidate_limit]:
            analysis = store.get_evidence_analysis(gid)
            if not analysis:
                snapshot = store.get_latest_snapshot(gid)
                readme_text = snapshot.readme_text if snapshot else ""
                if not readme_text and "实时GitHub" in search_source:
                    snap, _ = gh_client.get_readme_snapshot(repo.owner, repo.name, repo.github_id)
                    if snap:
                        store.save_evidence_snapshot(snap)
                        readme_text = snap.readme_text
                analysis = summarizer.summarize(repo, readme_text, parsed)
                store.save_evidence_analysis(analysis)
            candidate_pairs.append((repo, analysis))

        triaged = triager.triage(candidate_pairs, parsed)
        st.session_state["search_results"] = triaged

# 结果展示
if st.session_state.get("search_results"):
    triaged = st.session_state["search_results"]
    st.divider()

    # 对比抽屉提示
    if st.session_state["compare_list"]:
        c_bar, c_clear = st.columns([5, 1])
        with c_bar:
            st.info(f"已选取 **{len(st.session_state['compare_list'])}** 个项目准备对比: " + ", ".join(st.session_state['compare_list']))
        with c_clear:
            if st.button("清空对比"):
                st.session_state["compare_list"] = []
                st.rerun()

    tab1, tab2, tab3 = st.tabs([
        f"🌟 较完整方案 ({len(triaged['较完整方案'])})",
        f"🧩 可组合模块 ({len(triaged['可组合模块'])})",
        f"🔍 部分满足需求 ({len(triaged['部分满足需求'])})"
    ])

    def render_repo_card(item, key_prefix="card"):
        r = item.repository
        a = item.analysis
        with st.container():
            col_main, col_action = st.columns([7, 3])
            with col_main:
                st.markdown(f"### [{r.full_name}]({r.html_url}) &nbsp; `匹配得分: {item.match_score}`")
                st.markdown(f"**中文一句话用途**: {a.chinese_purpose}")

                # 标签与属性徽章
                badges = [
                    f"⭐ {r.stars:,}",
                    f"语言: {r.language or '未知'}",
                    f"开源协议: {a.license_summary}",
                    f"状态: {a.maintenance_status}",
                ]
                st.markdown(" | ".join([f"`{b}`" for b in badges]))

                # 兼容性表
                os_badges = []
                for os_name, os_stat in a.os_compatibility.items():
                    if os_stat == "支持":
                        os_badges.append(f"🟢 {os_name}: 支持")
                    elif os_stat == "不支持":
                        os_badges.append(f"🔴 {os_name}: 不支持")
                    else:
                        os_badges.append(f"⚪ {os_name}: 未知")
                st.caption(f"**操作系统证据**: {' | '.join(os_badges)} &nbsp;&nbsp;|&nbsp;&nbsp; **GPU需求**: {a.gpu_requirement}")

                # 满足与不满足
                with st.expander("🔎 查看能力证据与原文依据", expanded=False):
                    if item.matched_reasons:
                        st.markdown("**满足的条件**:")
                        for mr in item.matched_reasons:
                            st.write(f"- ✅ {mr}")
                    if item.unmatched_reasons:
                        st.markdown("**未满足或无证据的条件**:")
                        for ur in item.unmatched_reasons:
                            st.write(f"- ❓ {ur}")
                    if a.evidence_snippets:
                        st.markdown("**原文证据佐证**:")
                        for snip in a.evidence_snippets:
                            st.code(snip, language="markdown")

            with col_action:
                st.write("")
                # 收藏到集合
                all_cols = col_store.list_collections()
                target_col = st.selectbox(
                    "收藏至集合",
                    options=[c.name for c in all_cols],
                    key=f"{key_prefix}_sel_col_{r.github_id}"
                )
                target_status = st.selectbox(
                    "评估状态",
                    options=["待评估", "已试用", "已采用", "不适合"],
                    key=f"{key_prefix}_sel_stat_{r.github_id}"
                )
                if st.button("⭐ 确认收藏", key=f"{key_prefix}_btn_fav_{r.github_id}", use_container_width=True):
                    cid = next((c.id for c in all_cols if c.name == target_col), 1)
                    col_store.add_or_update_item(CollectionItem(
                        collection_id=cid,
                        repo_github_id=r.github_id,
                        evaluation_status=target_status
                    ))
                    st.toast(f"已加入收藏夹 [{target_col}]，状态: {target_status}！")

                # 加入对比
                if st.button("⚖️ 加入横向对比", key=f"{key_prefix}_btn_cmp_{r.github_id}", use_container_width=True):
                    if r.full_name not in st.session_state["compare_list"]:
                        if len(st.session_state["compare_list"]) >= 4:
                            st.warning("一次最多支持对比 4 个仓库")
                        else:
                            st.session_state["compare_list"].append(r.full_name)
                            st.rerun()

            st.divider()

    with tab1:
        if triaged["较完整方案"]:
            for idx, it in enumerate(triaged["较完整方案"]):
                render_repo_card(it, f"comp_{idx}")
        else:
            st.info("未发现完全覆盖所有必需能力的单一方案。建议查看【可组合模块】进行模块化组合。")

    with tab2:
        if triaged["可组合模块"]:
            for idx, it in enumerate(triaged["可组合模块"]):
                render_repo_card(it, f"mod_{idx}")
        else:
            st.info("暂无可组合垂直模块。")

    with tab3:
        if triaged["部分满足需求"]:
            for idx, it in enumerate(triaged["部分满足需求"]):
                render_repo_card(it, f"part_{idx}")
        else:
            st.info("无部分匹配项目。")

# 横向对比面板 (若用户选取了 2-4 个项目)
if len(st.session_state["compare_list"]) >= 2:
    st.subheader(f"⚖️ 选定项目多维横向对比 ({len(st.session_state['compare_list'])} 个)")
    cmp_repos = []
    for full_name in st.session_state["compare_list"]:
        r = store.get_repository_by_name(full_name)
        if r:
            a = store.get_evidence_analysis(r.github_id)
            cmp_repos.append((r, a))

    if cmp_repos:
        cols = st.columns(len(cmp_repos))
        for i, (r, a) in enumerate(cmp_repos):
            with cols[i]:
                st.markdown(f"#### [{r.name}]({r.html_url})")
                st.markdown(f"**全称**: `{r.full_name}`")
                st.markdown(f"**语言**: `{r.language or '未知'}`")
                st.markdown(f"**Stars**: `{r.stars:,}`")
                st.markdown(f"**开源协议**: `{a.license_summary if a else r.license_spdx}`")
                st.markdown(f"**Windows支持**: `{a.os_compatibility.get('Windows', '未知') if a else '未知'}`")
                st.markdown(f"**GPU要求**: `{a.gpu_requirement if a else '未知'}`")
                st.markdown(f"**维护状态**: `{a.maintenance_status if a else '活跃'}`")
                st.markdown(f"**中文一句话**: {a.chinese_purpose if a else (r.description or '')}")
