import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { CollectionItem } from '../types';
import { Download, Trash2, ExternalLink, Save } from 'lucide-react';

export const CollectionTab: React.FC = () => {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('全部');
  const [editingNotes, setEditingNotes] = useState<{ [id: number]: string }>({});

  const reloadItems = () => {
    const list = StorageService.getItems();
    setItems(list);
    const noteMap: { [id: number]: string } = {};
    list.forEach(i => {
      noteMap[i.repo_github_id] = i.user_notes;
    });
    setEditingNotes(noteMap);
  };

  useEffect(() => {
    reloadItems();
  }, []);

  const counts = {
    total: items.length,
    pending: items.filter(i => i.evaluation_status === '待评估').length,
    tested: items.filter(i => i.evaluation_status === '已试用').length,
    adopted: items.filter(i => i.evaluation_status === '已采用').length,
    rejected: items.filter(i => i.evaluation_status === '不适合').length,
  };

  const filtered = items.filter(i => {
    if (filterStatus === '全部') return true;
    return i.evaluation_status === filterStatus;
  });

  const handleStatusChange = (id: number, newStatus: CollectionItem['evaluation_status']) => {
    const item = items.find(i => i.repo_github_id === id);
    if (!item) return;
    StorageService.saveItem(item.repo, item.analysis!, newStatus, editingNotes[id]);
    reloadItems();
  };

  const handleSaveNotes = (id: number) => {
    const item = items.find(i => i.repo_github_id === id);
    if (!item) return;
    StorageService.saveItem(item.repo, item.analysis!, item.evaluation_status, editingNotes[id] || '');
    reloadItems();
  };

  const handleRemove = (id: number) => {
    StorageService.removeItem(id);
    reloadItems();
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 漏斗指标与操作栏 */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">⭐ 我的收藏与评估漏斗</h2>
            <p className="text-sm text-slate-400">
              数据保存在你的浏览器本地，支持记录本地实测避坑笔记，并可导出为标准表格。
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => downloadFile(StorageService.exportJSON(), 'radar_collections.json', 'application/json')}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出 JSON</span>
            </button>
            <button
              onClick={() => downloadFile(StorageService.exportCSV(), 'radar_collections.csv', 'text/csv')}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出 CSV</span>
            </button>
          </div>
        </div>

        {/* 漏斗指标卡 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setFilterStatus('待评估')}
            className={`p-3 rounded-xl border cursor-pointer transition ${filterStatus === '待评估' ? 'bg-amber-500/15 border-amber-500' : 'bg-slate-900/60 border-slate-800'}`}
          >
            <span className="text-xs text-amber-400 block mb-1">⏳ 待评估</span>
            <span className="text-xl font-bold text-white">{counts.pending}</span>
          </div>

          <div
            onClick={() => setFilterStatus('已试用')}
            className={`p-3 rounded-xl border cursor-pointer transition ${filterStatus === '已试用' ? 'bg-sky-500/15 border-sky-500' : 'bg-slate-900/60 border-slate-800'}`}
          >
            <span className="text-xs text-sky-400 block mb-1">🧪 已试用</span>
            <span className="text-xl font-bold text-white">{counts.tested}</span>
          </div>

          <div
            onClick={() => setFilterStatus('已采用')}
            className={`p-3 rounded-xl border cursor-pointer transition ${filterStatus === '已采用' ? 'bg-emerald-500/15 border-emerald-500' : 'bg-slate-900/60 border-slate-800'}`}
          >
            <span className="text-xs text-emerald-400 block mb-1">🏆 已采用</span>
            <span className="text-xl font-bold text-white">{counts.adopted}</span>
          </div>

          <div
            onClick={() => setFilterStatus('不适合')}
            className={`p-3 rounded-xl border cursor-pointer transition ${filterStatus === '不适合' ? 'bg-rose-500/15 border-rose-500' : 'bg-slate-900/60 border-slate-800'}`}
          >
            <span className="text-xs text-rose-400 block mb-1">❌ 不适合</span>
            <span className="text-xl font-bold text-white">{counts.rejected}</span>
          </div>
        </div>
      </div>

      {/* 列表 */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-slate-800/30 border border-slate-800 rounded-2xl text-slate-400">
          暂无收藏项目。在【自然语言找项目】或【领域分类目录】中点击“加入收藏”即可归集。
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(item => (
            <div
              key={item.repo_github_id}
              className="p-5 bg-slate-800/50 border border-slate-700/70 rounded-2xl space-y-3"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={item.repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-white hover:text-sky-400 transition flex items-center space-x-1"
                    >
                      <span>{item.repo.full_name}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </a>
                    <span className="text-xs text-slate-400">⭐ {item.repo.stars.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{item.analysis?.chinese_purpose || item.repo.description}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <select
                    value={item.evaluation_status}
                    onChange={e => handleStatusChange(item.repo_github_id, e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
                  >
                    <option value="待评估">待评估</option>
                    <option value="已试用">已试用</option>
                    <option value="已采用">已采用</option>
                    <option value="不适合">不适合</option>
                  </select>

                  <button
                    onClick={() => handleRemove(item.repo_github_id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                    title="移出收藏"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 实测笔记输入 */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={editingNotes[item.repo_github_id] ?? ''}
                  onChange={e => setEditingNotes({ ...editingNotes, [item.repo_github_id]: e.target.value })}
                  placeholder="记录你的实测环境、踩坑笔记或评估心得..."
                  className="flex-1 bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  onClick={() => handleSaveNotes(item.repo_github_id)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-200 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>保存笔记</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
