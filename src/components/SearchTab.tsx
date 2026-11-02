import React, { useState } from 'react';
import { Search, Sparkles, CheckCircle2, HelpCircle, XCircle, ExternalLink, BookmarkPlus, Layers, Scale } from 'lucide-react';
import { ParsedQuery, SearchResultItem, Repository, EvidenceAnalysis } from '../types';
import { parseNaturalLanguageQuery, scoreAndTriage } from '../services/queryService';
import { SEED_ITEMS } from '../data/seedData';
import { GitHubService } from '../services/githubService';
import { StorageService } from '../services/storageService';

interface SearchTabProps {
  onAddToCompare: (repo: Repository, analysis: EvidenceAnalysis) => void;
  compareList: { repo: Repository; analysis: EvidenceAnalysis }[];
}

export const SearchTab: React.FC<SearchTabProps> = ({ onAddToCompare, compareList }) => {
  const sampleQueries = [
    "我想找能下载宏观数据、做面板回归、输出 LaTeX 表格的 Python 项目，最好能在 Windows 上运行。",
    "找能解析学术论文PDF、抽取表格和公式并转成Markdown的Python库，不要付费OCR服务。",
    "支持国内商品期货CTP接口、带GUI界面并能进行CTA策略回测的开源交易框架。",
    "用代码制作3Blue1Brown风格的数学和技术推导高清动画的Python库。",
  ];

  const [inputQuery, setInputQuery] = useState(sampleQueries[0]);
  const [parsed, setParsed] = useState<ParsedQuery | null>(() => parseNaturalLanguageQuery(sampleQueries[0]));
  const [results, setResults] = useState<{
    '较完整方案': SearchResultItem[];
    '可组合模块': SearchResultItem[];
    '部分满足需求': SearchResultItem[];
  } | null>(() => {
    const p = parseNaturalLanguageQuery(sampleQueries[0]);
    return scoreAndTriage(SEED_ITEMS.map(i => ({ repo: i.repo, analysis: i.analysis })), p);
  });
  const [isSearching, setIsSearching] = useState(false);
  const [activeResultGroup, setActiveResultGroup] = useState<'较完整方案' | '可组合模块' | '部分满足需求'>('较完整方案');
  const [statusMessage, setStatusMessage] = useState('');

  const handleSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsSearching(true);
    setStatusMessage('');

    const p = parseNaturalLanguageQuery(queryText);
    setParsed(p);

    // 1. 本地精选种子库候选
    const localCandidates = SEED_ITEMS.map(i => ({ repo: i.repo, analysis: i.analysis }));

    // 2. 实时 GitHub Search API 扩展抓取
    let remoteCandidates: { repo: Repository; analysis: EvidenceAnalysis }[] = [];
    if (p.generated_github_queries.length > 0) {
      const q = p.generated_github_queries[0];
      remoteCandidates = await GitHubService.searchRemote(q, 4);
    }

    const allCandidates = [...localCandidates, ...remoteCandidates];
    // 根据 github_id 去重
    const uniqueMap = new Map<number, { repo: Repository; analysis: EvidenceAnalysis }>();
    for (const c of allCandidates) {
      if (!uniqueMap.has(c.repo.github_id)) {
        uniqueMap.set(c.repo.github_id, c);
      }
    }

    const triaged = scoreAndTriage(Array.from(uniqueMap.values()), p);
    setResults(triaged);
    setIsSearching(false);
  };

  const handleSaveToCollection = (repo: Repository, analysis: EvidenceAnalysis) => {
    StorageService.saveItem(repo, analysis, '待评估');
    setStatusMessage(`已成功收藏 ${repo.name} 到「我的收藏与评估」！`);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 搜索输入与快捷样例 */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
          <span>🔍 自然语言找项目</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-normal">
            无幻觉 · 证据驱动
          </span>
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          直接输入中文业务或论文需求。系统自动抽取硬性约束与环境，并在没有明文证据时一律标注为“未知”。
        </p>

        {/* 预设按钮 */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs text-slate-400 self-center">💡 快捷用例:</span>
          {sampleQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputQuery(q);
                handleSearch(q);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition truncate max-w-xs"
              title={q}
            >
              {q.slice(0, 26)}...
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch(inputQuery)}
              placeholder="例如：输入你的研究需求、所需能力或运行环境..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm transition"
            />
          </div>
          <button
            onClick={() => handleSearch(inputQuery)}
            disabled={isSearching}
            className="flex items-center justify-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-sky-500/25 transition disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            <span>{isSearching ? '正在严谨解析...' : '智能解析与搜索'}</span>
          </button>
        </div>

        {statusMessage && (
          <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg animate-fade-in">
            {statusMessage}
          </div>
        )}

        {/* 结构化条件透传卡片 */}
        {parsed && (
          <div className="mt-5 pt-4 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">🎯 核心目标</span>
              <span className="font-semibold text-slate-200">{parsed.target || '全部开源项目'}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">⚡ 必需能力</span>
              <span className="font-semibold text-sky-400">
                {parsed.required_capabilities.length ? parsed.required_capabilities.join(', ') : '未指定具体指标'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">💻 运行环境</span>
              <span className="font-semibold text-emerald-400">
                {parsed.environments.length ? parsed.environments.join(', ') : '跨平台 / 不限'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 block mb-1">🔍 生成 API 词</span>
              <span className="font-mono text-amber-400 truncate block">
                {parsed.generated_github_queries.join(' | ') || '通用匹配'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 三层分组导航 Tabs */}
      {results && (
        <div className="space-y-4">
          <div className="flex border-b border-slate-800">
            {(['较完整方案', '可组合模块', '部分满足需求'] as const).map(group => {
              const count = results[group].length;
              const isActive = activeResultGroup === group;
              return (
                <button
                  key={group}
                  onClick={() => setActiveResultGroup(group)}
                  className={`py-3 px-5 text-sm font-semibold border-b-2 flex items-center space-x-2 transition ${
                    isActive
                      ? 'border-sky-500 text-sky-400 bg-sky-500/5'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{group === '较完整方案' ? '🌟' : group === '可组合模块' ? '🧩' : '🔍'} {group}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 卡片列表 */}
          <div className="grid grid-cols-1 gap-4">
            {results[activeResultGroup].length === 0 ? (
              <div className="p-12 text-center bg-slate-800/30 border border-slate-800 rounded-2xl text-slate-400">
                该分层中暂未发现匹配项目，建议查看其他两层方案或更换需求描述。
              </div>
            ) : (
              results[activeResultGroup].map((item, idx) => {
                const r = item.repository;
                const a = item.analysis;
                const isCompared = compareList.some(c => c.repo.github_id === r.github_id);

                return (
                  <div
                    key={idx}
                    className="p-5 bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/70 hover:border-sky-500/50 rounded-2xl transition shadow-lg space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-1.5 flex-wrap">
                          <a
                            href={r.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-lg font-bold text-white hover:text-sky-400 transition flex items-center space-x-1.5"
                          >
                            <span>{r.full_name}</span>
                            <ExternalLink className="w-4 h-4 opacity-70" />
                          </a>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20">
                            匹配度: {item.match_score}分
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                            ⭐ {r.stars.toLocaleString()}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                            {r.language || '未知语言'}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                            协议: {a.license_summary}
                          </span>
                        </div>

                        <p className="text-sm text-slate-200 leading-relaxed font-medium">
                          {a.chinese_purpose}
                        </p>
                      </div>

                      {/* 操作按钮组 */}
                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleSaveToCollection(r, a)}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-medium transition"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          <span>收藏评估</span>
                        </button>

                        <button
                          onClick={() => onAddToCompare(r, a)}
                          disabled={isCompared}
                          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                            isCompared
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 opacity-60'
                              : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200'
                          }`}
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>{isCompared ? '已在对比' : '横向比对'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 兼容性与运行证据 */}
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400">系统兼容性:</span>
                        <span className={a.os_compatibility.Windows === '支持' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                          Win: {a.os_compatibility.Windows}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className={a.os_compatibility.Linux === '支持' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                          Linux: {a.os_compatibility.Linux}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span className={a.os_compatibility.macOS === '支持' ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                          macOS: {a.os_compatibility.macOS}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400">GPU要求:</span>
                        <span className="text-slate-200">{a.gpu_requirement}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400">维护状态:</span>
                        <span className={a.maintenance_status === '活跃' ? 'text-emerald-400' : 'text-amber-400'}>
                          {a.maintenance_status}
                        </span>
                      </div>
                    </div>

                    {/* 满足与不满足清单 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                      {item.matched_reasons.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>确认满足的条件:</span>
                          </span>
                          <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                            {item.matched_reasons.map((mr, i) => (
                              <li key={i}>{mr}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {item.unmatched_reasons.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-amber-400 font-semibold flex items-center space-x-1">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>存疑或未查到证据项:</span>
                          </span>
                          <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                            {item.unmatched_reasons.map((ur, i) => (
                              <li key={i}>{ur}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* 原文证据片段 */}
                    {a.evidence_snippets && a.evidence_snippets.length > 0 && (
                      <div className="text-[11px] font-mono text-slate-400 bg-slate-950/70 p-2.5 rounded-lg border border-slate-900 truncate">
                        原文证据: {a.evidence_snippets[0]}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
