import React from 'react';
import { Search, Compass, BookmarkCheck, RefreshCw, Settings, Github } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSettings: () => void;
  compareCount: number;
  onOpenCompare: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  compareCount,
  onOpenCompare,
}) => {
  const tabs = [
    { id: 'search', label: '自然语言找项目', icon: Search },
    { id: 'catalog', label: '领域分类目录', icon: Compass },
    { id: 'collection', label: '我的收藏与评估', icon: BookmarkCheck },
    { id: 'subscriptions', label: '订阅与更新中心', icon: RefreshCw },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('search')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-bold text-lg">
            📡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">RepoRadar CN</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">Web 版</span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">中文优先 · 证据驱动 · 适用性决策</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action icons */}
        <div className="flex items-center space-x-2">
          {compareCount > 0 && (
            <button
              onClick={onOpenCompare}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-medium hover:bg-amber-500/20 transition"
            >
              <span>⚖️ 对比 ({compareCount})</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="系统与 Token 配置"
          >
            <Settings className="w-5 h-5" />
          </button>

          <a
            href="https://github.com/hantrleko/repo-radar"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="GitHub 仓库"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
};
