import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { SearchTab } from './components/SearchTab';
import { CatalogTab } from './components/CatalogTab';
import { CollectionTab } from './components/CollectionTab';
import { SubscriptionTab } from './components/SubscriptionTab';
import { CompareModal } from './components/CompareModal';
import { SettingsModal } from './components/SettingsModal';
import { Repository, EvidenceAnalysis } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('search');
  const [compareList, setCompareList] = useState<{ repo: Repository; analysis: EvidenceAnalysis }[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleAddToCompare = (repo: Repository, analysis: EvidenceAnalysis) => {
    if (compareList.some(c => c.repo.github_id === repo.github_id)) return;
    if (compareList.length >= 4) {
      alert('最多支持同时对比 4 个仓库');
      return;
    }
    setCompareList([...compareList, { repo, analysis }]);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        compareCount={compareList.length}
        onOpenCompare={() => setIsCompareOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {activeTab === 'search' && (
          <SearchTab onAddToCompare={handleAddToCompare} compareList={compareList} />
        )}
        {activeTab === 'catalog' && <CatalogTab />}
        {activeTab === 'collection' && <CollectionTab />}
        {activeTab === 'subscriptions' && <SubscriptionTab />}
      </main>

      {/* Modals */}
      {isCompareOpen && (
        <CompareModal
          items={compareList}
          onClose={() => setIsCompareOpen(false)}
          onClear={() => {
            setCompareList([]);
            setIsCompareOpen(false);
          }}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>个人开源项目雷达 · 秉持中文优先、事实证据驱动、零模型幻觉原则</p>
          <div className="flex items-center space-x-4">
            <a href="https://github.com/hantrleko/repo-radar" target="_blank" rel="noreferrer" className="hover:text-slate-300 transition">
              GitHub 源码
            </a>
            <a href="https://hantrleko.github.io/repo-radar/" className="hover:text-slate-300 transition">
              GitHub Pages 在线版
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
