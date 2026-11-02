"""
个人开源项目雷达 (Repo Radar) - Streamlit 主入口
"""
import streamlit as st
import sys
from pathlib import Path

# 确保 repo_radar 包在 Python 路径中
sys_path = str(Path(__file__).resolve().parent.parent.parent)
if sys_path not in sys.path:
    sys.path.insert(0, sys_path)

from repo_radar.config import DOMAINS_TAXONOMY, settings
from repo_radar.storage.db import init_db
from repo_radar.storage.repo_store import RepoStore
from repo_radar.storage.collection_store import CollectionStore
from repo_radar.storage.subscription_store import SubscriptionStore
from repo_radar.sources.seed_loader import load_seed_data

st.set_page_config(
    page_title="个人开源项目雷达",
    page_icon="📡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# 确保数据库与种子数据就绪
@st.cache_resource
def setup_radar():
    init_db()
    store = RepoStore()
    existing_repos = store.list_all_repos(limit=5)
    if len(existing_repos) == 0:
        load_seed_data(store)
    return True

setup_radar()

store = RepoStore()
col_store = CollectionStore()
sub_store = SubscriptionStore()

# 侧边栏
st.sidebar.title("📡 开源项目雷达")
st.sidebar.caption("中文优先 · 证据驱动 · 适用性决策")

repos_count = len(store.list_all_repos(limit=1000))
collections = col_store.list_collections()
total_collected = len(col_store.list_items_with_repo())
subs = sub_store.list_subscriptions()
events = sub_store.list_change_events(limit=10)

st.sidebar.divider()
st.sidebar.metric("已收录项目", f"{repos_count} 个")
st.sidebar.metric("我的收藏与评估", f"{total_collected} 个")
st.sidebar.metric("活跃跟踪订阅", f"{len(subs)} 条")

# 主页内容
st.title("📡 个人开源项目雷达 (RepoRadar CN)")
st.markdown("""
> **核心原则**：不只是 GitHub 搜索框，而是把 **“描述需求 → 找候选 → 判断适用性 → 收藏分类 → 持续跟踪”** 连成闭环。
> 所有的 Windows 兼容性、GPU 依赖与适用场景均严格基于 README 原文材料，无证据时展示为 **“未知”**，杜绝模型幻觉。
""")

st.write("")

# 快捷统计看板
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.info(f"**📚 领域知识库**\n\n4 大垂直领域 · 24 个细分类目")
with col2:
    st.success(f"**⭐ 评估漏斗**\n\n{total_collected} 个项目正在跟踪评估")
with col3:
    st.warning(f"**🔄 订阅水线**\n\n已建立 {len(subs)} 个自动监控任务")
with col4:
    unread_events = [e for e in events if not e.is_read]
    st.error(f"**🔔 近期变动**\n\n发现 {len(unread_events)} 个未读变更事件")

st.divider()

# 快速导航卡片
st.subheader("🎯 探索四大领域")
cols = st.columns(4)
domain_keys = list(DOMAINS_TAXONOMY.keys())

for idx, domain in enumerate(domain_keys):
    with cols[idx]:
        st.markdown(f"### {domain}")
        subcats = DOMAINS_TAXONOMY[domain]
        st.caption(" · ".join(subcats[:3]) + " 等")
        domain_repos = store.list_repos_by_domain(domain)
        st.write(f"当前精选收录: **{len(domain_repos)}** 个项目")
        if st.button(f"浏览 {domain}", key=f"btn_d_{idx}"):
            st.session_state["selected_domain"] = domain
            st.switch_page("pages/2_📚_领域分类目录.py")

st.divider()

# 近期动态与变更事件流
st.subheader("🔔 最近更新与监控事件流")
if events:
    for ev in events[:5]:
        with st.container():
            c_tag, c_detail, c_time = st.columns([1.5, 6, 2.5])
            with c_tag:
                if ev.change_type == "新发现":
                    st.badge("新发现", color="blue")
                elif ev.change_type == "README功能变化":
                    st.badge("功能变更", color="orange")
                else:
                    st.badge(ev.change_type)
            with c_detail:
                st.markdown(f"**[{ev.repo_full_name}](https://github.com/{ev.repo_full_name})**: {ev.detail}")
            with c_time:
                st.caption(f"{ev.occurred_at or '刚刚'}")
else:
    st.info("暂无变更事件。你可以在【4_🔄_订阅与更新中心】添加你的研究订阅任务。")
