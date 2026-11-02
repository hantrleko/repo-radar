"""
我的收藏夹、评估状态漏斗与笔记管理 (支持 JSON / CSV 导出)
"""
import streamlit as st
import sys
from pathlib import Path

sys_path = str(Path(__file__).resolve().parent.parent.parent.parent)
if sys_path not in sys.path:
    sys.path.insert(0, sys_path)

from repo_radar.storage.collection_store import CollectionStore
from repo_radar.storage.repo_store import RepoStore
from repo_radar.models.collection import CollectionItem

st.set_page_config(page_title="我的收藏与评估 - 个人开源雷达", page_icon="⭐", layout="wide")

col_store = CollectionStore()
repo_store = RepoStore()

st.title("⭐ 我的收藏与评估漏斗")
st.caption("管理候选仓库的试用进程，记录本地实测笔记，沉淀个人开源资产库。")

collections = col_store.list_collections()

# 顶部操作栏：新建集合与导出
c_col, c_stat, c_new, c_exp = st.columns([2.5, 2.5, 2.5, 2.5])
with c_col:
    col_names = ["全部集合"] + [c.name for c in collections]
    selected_col_name = st.selectbox("当前查看集合", col_names)
with c_stat:
    status_filter = st.selectbox("评估状态筛选", ["全部", "待评估", "已试用", "已采用", "不适合"])
with c_new:
    with st.popover("➕ 新建收藏集合"):
        new_cname = st.text_input("集合名称", placeholder="例如：宏观数据分析工具箱")
        new_cdesc = st.text_input("描述说明", placeholder="用于计量经济学论文")
        if st.button("创建"):
            if new_cname.strip():
                col_store.create_collection(new_cname.strip(), new_cdesc.strip())
                st.toast(f"已创建集合 {new_cname}！")
                st.rerun()
with c_exp:
    with st.popover("📥 导出项目列表"):
        target_cid = None
        if selected_col_name != "全部集合":
            target_cid = next((c.id for c in collections if c.name == selected_col_name), None)
        json_str = col_store.export_collection_json(target_cid)
        csv_str = col_store.export_collection_csv(target_cid)

        st.download_button(
            "导出为 JSON",
            data=json_str,
            file_name=f"radar_collection_{selected_col_name}.json",
            mime="application/json",
            use_container_width=True
        )
        st.download_button(
            "导出为 CSV 表格",
            data=csv_str,
            file_name=f"radar_collection_{selected_col_name}.csv",
            mime="text/csv",
            use_container_width=True
        )

st.divider()

# 获取列表
selected_cid = None
if selected_col_name != "全部集合":
    selected_cid = next((c.id for c in collections if c.name == selected_col_name), None)

items_with_repo = col_store.list_items_with_repo(selected_cid, status_filter)

# 评估漏斗指标卡
s_all = len(items_with_repo)
s_pending = sum(1 for it, _ in items_with_repo if it.evaluation_status == "待评估")
s_tested = sum(1 for it, _ in items_with_repo if it.evaluation_status == "已试用")
s_adopted = sum(1 for it, _ in items_with_repo if it.evaluation_status == "已采用")
s_rejected = sum(1 for it, _ in items_with_repo if it.evaluation_status == "不适合")

m1, m2, m3, m4 = st.columns(4)
m1.metric("⏳ 待评估", f"{s_pending} 个")
m2.metric("🧪 已试用", f"{s_tested} 个")
m3.metric("🏆 已采用", f"{s_adopted} 个")
m4.metric("❌ 不适合", f"{s_rejected} 个")

st.divider()

if not items_with_repo:
    st.info("当前没有符合条件的收藏项目。在搜索结果中点击【⭐ 确认收藏】即可收录。")
else:
    for item, r in items_with_repo:
        analysis = repo_store.get_evidence_analysis(r.github_id)
        with st.container():
            c_info, c_action = st.columns([6.5, 3.5])
            with c_info:
                st.markdown(f"### [{r.full_name}]({r.html_url})")
                if analysis:
                    st.markdown(f"**中文用途**: {analysis.chinese_purpose}")
                st.markdown(f"`⭐ {r.stars:,}` | `语言: {r.language or '未知'}` | `许可证: {r.license_spdx or '未知'}`")
                st.caption(f"收藏加入时间: {item.added_at or '未知'}")

            with c_action:
                new_stat = st.selectbox(
                    "评估状态",
                    options=["待评估", "已试用", "已采用", "不适合"],
                    index=["待评估", "已试用", "已采用", "不适合"].index(item.evaluation_status),
                    key=f"st_{item.collection_id}_{r.github_id}"
                )
                new_notes = st.text_area(
                    "个人试用笔记/评价",
                    value=item.user_notes,
                    placeholder="记录安装体验、报错、Windows兼容实测等...",
                    key=f"nt_{item.collection_id}_{r.github_id}",
                    height=70
                )
                col_save, col_del = st.columns([2, 1])
                with col_save:
                    if st.button("保存评估与笔记", key=f"btn_s_{item.collection_id}_{r.github_id}", use_container_width=True):
                        item.evaluation_status = new_stat
                        item.user_notes = new_notes
                        col_store.add_or_update_item(item)
                        st.toast("已保存评估笔记！")
                with col_del:
                    if st.button("移出", key=f"btn_d_{item.collection_id}_{r.github_id}", use_container_width=True):
                        col_store.remove_item(item.collection_id, r.github_id)
                        st.toast(f"已从当前集合移出 {r.name}")
                        st.rerun()

            st.divider()
