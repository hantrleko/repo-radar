"""
订阅监控与更新中心 (增量水位线跟踪、README 变更感知与变动日志)
"""
import streamlit as st
import sys
from pathlib import Path

sys_path = str(Path(__file__).resolve().parent.parent.parent.parent)
if sys_path not in sys.path:
    sys.path.insert(0, sys_path)

from repo_radar.storage.subscription_store import SubscriptionStore
from repo_radar.subscriptions.monitor import SubscriptionMonitor
from repo_radar.models.subscription import Subscription

st.set_page_config(page_title="订阅与更新中心 - 个人开源雷达", page_icon="🔄", layout="wide")

sub_store = SubscriptionStore()
monitor = SubscriptionMonitor()

st.title("🔄 持续订阅与更新中心")
st.markdown("""
> 保存一次需求即可建立订阅，系统定期跟踪：**新发现项目、README 功能描述变更、归档/转移、许可证变更**。
> 更新任务具备 API 与 Token 预算控制；星标微变不触发重算，唯有实质内容变化才生成证据更新。
""")

# 顶部操作栏
c_btn, c_new, c_mark = st.columns([3, 4, 3])
with c_btn:
    if st.button("🚀 立即执行一次增量更新刷新", type="primary", use_container_width=True):
        with st.spinner("正在按订阅水位线轮询 GitHub 并比对内容哈希..."):
            events = monitor.run_all_updates()
            st.success(f"刷新完成！共捕获 {len(events)} 项新变动。")
            st.rerun()

with c_new:
    with st.popover("➕ 新建需求订阅任务"):
        sub_name = st.text_input("订阅名称", placeholder="例如：前沿宏观计量与因果推断")
        sub_query = st.text_input("检索关键词/表达式", placeholder="例如：panel data econometrics python")
        sub_domain = st.selectbox("归属领域", ["金融与经济研究", "学术研究", "量化交易", "视频与图片创作"])
        sub_freq = st.slider("推荐刷新周期 (天)", 1, 30, 7)
        if st.button("确认添加订阅"):
            if sub_name.strip() and sub_query.strip():
                sub_store.add_subscription(Subscription(
                    name=sub_name.strip(),
                    query_str=sub_query.strip(),
                    domain=sub_domain,
                    frequency_days=sub_freq
                ))
                st.toast(f"已创建订阅: {sub_name}")
                st.rerun()

with c_mark:
    if st.button("✔️ 全部标记为已读", use_container_width=True):
        sub_store.mark_all_as_read()
        st.toast("已清除所有未读提示")
        st.rerun()

st.divider()

# 当前订阅列表
st.subheader("📋 活跃监控中的需求订阅")
subs = sub_store.list_subscriptions()
if not subs:
    st.info("当前暂无订阅。点击上方【➕ 新建需求订阅任务】开始持续监控。")
else:
    for s in subs:
        c1, c2, c3, c4 = st.columns([3, 4, 3, 1])
        with c1:
            st.markdown(f"**{s.name}** &nbsp; `[{s.domain}]`")
        with c2:
            st.caption(f"查询表达式: `{s.query_str}`")
        with c3:
            st.caption(f"最后检查: {s.last_checked_at or '尚未抓取'} | 水位: {s.last_pushed_watermark or '无'}")
        with c4:
            if st.button("删除", key=f"del_sub_{s.id}"):
                sub_store.delete_subscription(s.id)
                st.toast(f"已取消订阅 {s.name}")
                st.rerun()

st.divider()

# 变更事件日志流
st.subheader("🔔 变更事件追溯与日志 (Change Events)")
events = sub_store.list_change_events(limit=50)

if not events:
    st.info("暂无变更记录。执行【立即执行一次增量更新刷新】以获取最新动态。")
else:
    for ev in events:
        with st.container():
            c_badge, c_repo, c_detail, c_time = st.columns([1.5, 3, 4.5, 2])
            with c_badge:
                if ev.change_type == "新发现":
                    st.badge("✨ 新发现", color="blue")
                elif ev.change_type == "README功能变化":
                    st.badge("📝 README变更", color="orange")
                elif ev.change_type == "归档或转移":
                    st.badge("⚠️ 状态异动", color="red")
                elif ev.change_type == "许可证变化":
                    st.badge("⚖️ 协议变动", color="yellow")
                else:
                    st.badge(ev.change_type)
            with c_repo:
                st.markdown(f"**[{ev.repo_full_name}](https://github.com/{ev.repo_full_name})**")
            with c_detail:
                st.write(ev.detail)
            with c_time:
                st.caption(f"{ev.occurred_at or '未知时间'}")
            st.divider()
