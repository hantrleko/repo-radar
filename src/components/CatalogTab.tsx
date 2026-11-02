import React, { useState } from 'react';
import { TAXONOMY, SEED_ITEMS } from '../data/seedData';
import { ExternalLink, BookmarkPlus } from 'lucide-react';
import { StorageService } from '../services/storageService';

export const CatalogTab: React.FC = () => {
  const domains = Object.keys(TAXONOMY) as (keyof typeof TAXONOMY)[];
  const [selectedDomain, setSelectedDomain] = useState<keyof typeof TAXONOMY>(domains[1]); // 金融与经济研究
  const [selectedSubcat, setSelectedSubcat] = useState<string>('全部');
  const [toast, setToast] = useState('');

  const subcats = ['全部', ...TAXONOMY[selectedDomain]];

  const filteredItems = SEED_ITEMS.filter(item => {
    if (item.domain !== selectedDomain) return false;
    if (selectedSubcat !== '全部' && item.subcategory !== selectedSubcat) return false;
    return true;
  });

  const handleCollect = (item: typeof SEED_ITEMS[0]) => {
    StorageService.saveItem(item.repo, item.analysis, '待评估');
    setToast(`已收藏 ${item.repo.name} 到评估库`);
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-2">📚 垂直领域目录</h2>
        <p className="text-sm text-slate-400 mb-6">
          按四大领域精准分类索引。每个项目附带权威适用性证据与能力形态归属。
        </p>

        {/* 领域主切换 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {domains.map(d => {
            const isSelected = selectedDomain === d;
            return (
              <button
                key={d}
                onClick={() => {
                  setSelectedDomain(d);
                  setSelectedSubcat('全部');
                }}
                className={`p-4 rounded-xl border text-left transition ${
                  isSelected
                    ? 'bg-sky-600/15 border-sky-500 text-white shadow-lg shadow-sky-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <div className="font-bold text-base mb-1">{d}</div>
                <div className="text-xs text-slate-400">
                  {TAXONOMY[d].slice(0, 3).join(' · ')} 等
                </div>
              </button>
            );
          })}
        </div>

        {/* 子类目过滤器 */}
        <div className="flex flex-wrap gap-2">
          {subcats.map(sub => {
            const isSub = selectedSubcat === sub;
            return (
              <button
                key={sub}
                onClick={() => setSelectedSubcat(sub)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                  isSub
                    ? 'bg-sky-600 text-white border-sky-500 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>

        {toast && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg animate-fade-in">
            {toast}
          </div>
        )}
      </div>

      {/* 仓库展示卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map(item => (
          <div
            key={item.repo.github_id}
            className="p-5 bg-slate-800/50 border border-slate-700/70 rounded-2xl space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <a
                  href={item.repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-white hover:text-sky-400 transition flex items-center space-x-1.5"
                >
                  <span>{item.repo.full_name}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
                <div className="flex items-center space-x-1 text-xs">
                  <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    ⭐ {item.repo.stars.toLocaleString()}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400">
                    {item.subcategory}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-3">
                {item.analysis.chinese_purpose}
              </p>

              <div className="flex flex-wrap gap-1.5 text-[11px] mb-3">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  形态: {item.modality}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  能力: {item.capability}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400">
                  Win: {item.analysis.os_compatibility.Windows}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-700/60 text-xs">
              <span className="text-slate-500">协议: {item.analysis.license_summary}</span>
              <button
                onClick={() => handleCollect(item)}
                className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 border border-sky-500/30 font-medium transition"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>加入收藏</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
