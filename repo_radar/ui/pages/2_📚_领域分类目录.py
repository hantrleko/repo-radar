"""
领域分类目录浏览与多维标签管理
"""
import streamlit as st
import sys
from pathlib import Path

sys_path = str(Path(__file__).resolve().parent.parent.parent.parent)
if sys_path not in sys.path:
    sys.path.insert(0, sys_path)

from repo_radar.config import DOMAINS_TAXONOMY, CAPABILITY_TAGS, MODALITY_TAGS
from repo_radar.storage.repo_store import RepoStore
from repo_radar.storage.collection_store import CollectionStore
from repo_radar.models.repository import RepositoryTag
from repo_radar.models.collection import CollectionItem

st.set_page_config(page_title="领域分类目录 - 个人开源雷达", page_icon="📚", layout="wide")

store = RepoStore()
col_store = CollectionStore()

st.title("📚 领域分类目录")
st.caption("按垂直领域、横向能力与项目形态多维浏览收录项目。支持人工矫正标签，人工决定永久生效。")

# 领域选择
domains = list(DOMAINS_TAXONOMY.keys())
initial_domain_idx = 0
if "selected_domain" in st.session_state and st.session_state["selected_domain"] in domains:
    initial_domain_idx = domains.index(st.session_state["selected_domain"])

selected_domain = st.radio("选择主领域：", domains, index=initial_domain_idx, horizontal=True)

# 子类目与筛选
subcats = ["全部子类"] + DOMAINS_TAXONOMY[selected_domain]
col_sub, col_cap, col_mod = st.columns(3)
with col_sub:
    selected_subcat = st.selectbox("细分类目", subcats)
with col_cap:
    selected_cap = st.selectbox("能力标签", ["不限"] + CAPABILITY_TAGS)
with col_mod:
    selected_mod = st.selectbox("形态标签", ["不限"] + MODALITY_TAGS)

# 获取仓库列表
target_sub = selected_subcat if selected_subcat != "全部子类" else None
repos = store.list_repos_by_domain(selected_domain, target_sub)

st.write(f"当前筛选共收录 **{len(repos)}** 个开源项目")
st.divider()

if not repos:
    st.info("该类目下暂无收录项目。你可以通过【1_🔍_自然语言找项目】检索并收录到此领域。")
else:
    for r in repos:
        analysis = store.get_evidence_analysis(r.github_id)
        tags = store.get_tags_for_repo(r.github_id)
        current_tag = tags[0] if tags else None

        with st.container():
            col_l, col_r = st.columns([7, 3])
            with col_l:
                st.markdown(f"### [{r.full_name}]({r.html_url})")
                if analysis:
                    st.markdown(f"**中文用途**: {analysis.chinese_purpose}")
                else:
                    st.markdown(f"**项目描述**: {r.description or '暂无描述'}")

                st.markdown(f"`⭐ {r.stars:,}` | `语言: {r.language or '未知'}` | `许可证: {r.license_spdx or '未知'}`")

                if analysis:
                    st.caption(f"**Windows**: {analysis.os_compatibility.get('Windows', '未知')} | **GPU**: {analysis.gpu_requirement} | **维护**: {analysis.maintenance_status}")

            with col_r:
                with st.expander("🏷️ 调整分类标签 (人工优先)"):
                    new_subcat = st.selectbox("子类目", DOMAINS_TAXONOMY[selected_domain], index=0, key=f"sub_{r.github_id}")
                    new_cap = st.selectbox("核心能力", CAPABILITY_TAGS, key=f"cap_{r.github_id}")
                    new_mod = st.selectbox("形态", MODALITY_TAGS, key=f"mod_{r.github_id}")
                    if st.button("保存人工标签", key=f"btn_tag_{r.github_id}"):
                        store.save_tag(RepositoryTag(
                            repo_github_id=r.github_id,
                            domain=selected_domain,
                            subcategory=new_subcat,
                            capability=new_cap,
                            modality=new_mod,
                            is_manual=True
                        ))
                        st.toast(f"已更新 {r.name} 的标签！")
                        st.rerun()

            st.divider()
