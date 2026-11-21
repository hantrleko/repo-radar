import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  BookmarkPlus,
  Scale,
  Layers,
  ArrowRightLeft,
  Puzzle,
  FileSearch,
  BellRing,
  Info,
  AlertTriangle,
  FolderTree,
  Copy,
  BrainCircuit,
  ShieldAlert,
} from 'lucide-react';
import { ParsedQuery, SearchResultItem, Repository, EvidenceAnalysis } from '../types';
import { parseNaturalLanguageQuery, buildRelationQueries, scoreAndTriage } from '../services/queryService';
import { SEED_ITEMS } from '../data/seedData';
import { GitHubService } from '../services/githubService';
import { StorageService } from '../services/storageService';
import { EvidenceExtractor } from '../services/evidenceExtractor';
import { LLMService } from '../services/llmService';

interface SearchTabProps {
  onAddToCompare: (repo: Repository, analysis: EvidenceAnalysis) => void;
  compareList: { repo: Repository; analysis: EvidenceAnalysis }[];
  onOpenComposer: (repo: Repository, analysis: EvidenceAnalysis) => void;
}

function enrichSeedCandidates(): { repo: Repository; analysis: EvidenceAnalysis }[] {
  const userProfile = StorageService.getUserEnvProfile();
  const customCatalog = StorageService.getCustomCatalogItems();
  const allSeeds = [
    ...SEED_ITEMS.map(i => ({ repo: i.repo, analysis: { ...i.analysis } })),
    ...customCatalog.map(c => ({ repo: c.repo, analysis: { ...c.analysis } })),
  ];

  return allSeeds.map(({ repo, analysis }) => {
    const rawText = `${repo.description} ${analysis.chinese_purpose} ${analysis.evidence_snippets.join(' ')}`;
    if (!analysis.domain_probe) {
      analysis.domain_probe = EvidenceExtractor.probeDomainVertical(
        repo,
        rawText,
        analysis.external_dependencies.join(' ')
      );
    }
    analysis.env_alerts = EvidenceExtractor.checkEnvCollision(
      analysis,
      userProfile,
      rawText,
      analysis.external_dependencies.join(' ')
    );
    return { repo, analysis };
  });
}

export const SearchTab: React.FC<SearchTabProps> = ({ onAddToCompare, compareList, onOpenComposer }) => {
  const sampleQueries = [
    '我想找能下载宏观数据、做面板回归、输出 LaTeX 表格的 Python 项目，最好能在 Windows 上运行。',
    '找能解析学术论文PDF、抽取表格和公式并转成Markdown的Python库，不要付费OCR服务。',
    '支持国内商品期货CTP接口、带GUI界面并能进行CTA策略回测的开源交易框架。',
    '用代码制作3Blue1Brown风格的数学和技术推导高清动画的Python库。',
  ];

  const [searchMode, setSearchMode] = useState<'nl' | 'repo'>('nl');
  const [inputQuery, setInputQuery] = useState(sampleQueries[0]);
  const [repoUrlInput, setRepoUrlInput] = useState('https://github.com/bashtage/linearmodels');
  const [relationMode, setRelationMode] = useState<'alternative' | 'lightweight' | 'complementary'>('alternative');

  const [parsed, setParsed] = useState<ParsedQuery | null>(() => parseNaturalLanguageQuery(sampleQueries[0]));
  const [candidatesList, setCandidatesList] = useState<{ repo: Repository; analysis: EvidenceAnalysis }[]>(() =>
    enrichSeedCandidates()
  );

  const [results, setResults] = useState<{
    '较完整方案': SearchResultItem[];
    '可组合模块': SearchResultItem[];
    '部分满足需求': SearchResultItem[];
  } | null>(() => {
    const p = parseNaturalLanguageQuery(sampleQueries[0]);
    return scoreAndTriage(enrichSeedCandidates(), p);
  });

  const [isSearching, setIsSearching] = useState(false);
  const [isDeepInspecting, setIsDeepInspecting] = useState(false);
  const [inspectProgress, setInspectProgress] = useState<{ current: number; total: number } | null>(null);
  const [activeResultGroup, setActiveResultGroup] = useState<'较完整方案' | '可组合模块' | '部分满足需求'>('较完整方案');
  const [statusMessage, setStatusMessage] = useState('');
  const [relationDesc, setRelationDesc] = useState('');

  // 触发常规搜索（支持 V0.3 BYOK 大模型查询裂变）
  const handleSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsSearching(true);
    setStatusMessage('');
    setRelationDesc('');

    const baseParsed = parseNaturalLanguageQuery(queryText);
    const p = await LLMService.expandQueryWithLLM(queryText, baseParsed);
    setParsed(p);

    const localCandidates = enrichSeedCandidates();
    let remoteCandidates: { repo: Repository; analysis: EvidenceAnalysis }[] = [];

    if (p.generated_github_queries.length > 0) {
      const q = p.generated_github_queries[0];
      remoteCandidates = await GitHubService.searchRemote(q, 5);
    }

    const merged = [...localCandidates, ...remoteCandidates];
    const uniqueMap = new Map<number, { repo: Repository; analysis: EvidenceAnalysis }>();
    for (const c of merged) {
      if (!uniqueMap.has(c.repo.github_id)) {
        uniqueMap.set(c.repo.github_id, c);
      }
    }

    const uniqueCandidates = Array.from(uniqueMap.values());
    setCandidatesList(uniqueCandidates);
    setResults(scoreAndTriage(uniqueCandidates, p));
    setIsSearching(false);
  };

  // 以仓找仓 (方向二)
  const handleRelationSearch = async (targetRepo: Repository, mode: 'alternative' | 'lightweight' | 'complementary') => {
    setIsSearching(true);
    setStatusMessage('');
    const { queries, filterDesc } = buildRelationQueries(targetRepo, mode);
    setRelationDesc(filterDesc);

    const q = queries[0];
    const remote = await GitHubService.searchRemote(q, 6);
    const local = enrichSeedCandidates().filter(s => s.repo.github_id !== targetRepo.github_id);

    const merged = [...remote, ...local];
    const uniqueMap = new Map<number, { repo: Repository; analysis: EvidenceAnalysis }>();
    for (const c of merged) {
      if (c.repo.github_id !== targetRepo.github_id && !uniqueMap.has(c.repo.github_id)) {
        uniqueMap.set(c.repo.github_id, c);
      }
    }

    const p: ParsedQuery = {
      original_query: filterDesc,
      target: targetRepo.name,
      required_capabilities: [targetRepo.name],
      preferences: mode === 'lightweight' ? ['轻量简单'] : [],
      environments: ['Windows'],
      exclusions: [],
      target_languages: targetRepo.language ? [targetRepo.language] : [],
      generated_github_queries: queries,
    };
    setParsed(p);

    const uniqueCandidates = Array.from(uniqueMap.values());
    setCandidatesList(uniqueCandidates);
    setResults(scoreAndTriage(uniqueCandidates, p));
    setIsSearching(false);
  };

  const handleUrlRelationSearch = () => {
    const cleanUrl = repoUrlInput.trim().replace(/\/$/, '');
    const parts = cleanUrl.split('/');
    const repoName = parts.pop() || '';
    const ownerName = parts.pop() || '';

    const foundSeed = SEED_ITEMS.find(
      s =>
        s.repo.full_name.toLowerCase() === `${ownerName}/${repoName}`.toLowerCase() ||
        s.repo.name.toLowerCase() === repoName.toLowerCase()
    );

    const targetRepo: Repository = foundSeed
      ? foundSeed.repo
      : {
          github_id: Date.now(),
          full_name: `${ownerName || 'unknown'}/${repoName}`,
          owner: ownerName,
          name: repoName,
          description: '用户指定的外部仓库',
          html_url: cleanUrl,
          stars: 1000,
          language: 'Python',
          license_spdx: 'MIT',
          pushed_at: new Date().toISOString(),
          topics: [repoName],
        };

    handleRelationSearch(targetRepo, relationMode);
  };

  // V0.3 深度取证前 N 项 (README + 依赖 + 目录树骨架 + Open Issues + 领域探针 + 环境画像碰撞)
  const handleDeepInspectTop = async () => {
    if (!results) return;
    const savedLimit = parseInt(localStorage.getItem('repo_radar_inspect_limit') || '4', 10);
    setIsDeepInspecting(true);
    setInspectProgress({ current: 0, total: savedLimit });

    const currentCandidates = [...candidatesList];
    const inspected = await GitHubService.batchInspectCandidates(currentCandidates, savedLimit, (cur, tot) => {
      setInspectProgress({ current: cur, total: tot });
    });

    setCandidatesList(inspected);
    if (parsed) {
      setResults(scoreAndTriage(inspected, parsed));
    }
    setIsDeepInspecting(false);
    setInspectProgress(null);
    setStatusMessage(`已完成前 ${savedLimit} 项候选的 README、目录树骨架、Open Issues 踩坑及领域专属探针深挖！`);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  // 单个仓库深度取证
  const handleDeepInspectSingle = async (repo: Repository) => {
    setStatusMessage(`正在并发拉取 ${repo.name} 的 README、依赖树、全仓目录结构及 Open Issues...`);
    const { repo: newRepo, analysis: newAnalysis } = await GitHubService.deepInspectRepo(repo);

    const updated = candidatesList.map(c =>
      c.repo.github_id === repo.github_id ? { repo: newRepo, analysis: newAnalysis } : c
    );
    setCandidatesList(updated);
    if (parsed) {
      setResults(scoreAndTriage(updated, parsed));
    }
    setStatusMessage(`已完成 ${repo.name} 的全维深水区探针取证！`);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleSaveAsSubscription = () => {
    if (!parsed) return;
    const sub = {
      id: `sub_${Date.now()}`,
      name: parsed.target.slice(0, 18) || '自定义需求订阅',
      query_str: parsed.generated_github_queries[0] || parsed.target,
      domain: '跨领域综合',
      frequency: '每周一',
      is_active: true,
      last_checked_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    StorageService.saveSubscription(sub);
    setStatusMessage(`已成功将需求「${sub.name}」保存为持续监控订阅！`);
    setTimeout(() => setStatusMessage(''), 3500);
  };

  const handleSaveToCollection = (repo: Repository, analysis: EvidenceAnalysis) => {
    StorageService.saveItem(repo, analysis, '待评估');
    setStatusMessage(`已成功将 ${repo.name} 存入评估漏斗！`);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleCopyBibtex = (bib: string, repoName: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(bib);
      setStatusMessage(`已复制 ${repoName} 的 BibTeX 学术引用格式到剪贴板！`);
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* 模式切换 & 搜索栏 */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/70 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2 flex-wrap gap-y-1">
              <span>📡 开源雷达智能发现与深水区取证</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                V0.3 旗舰版
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              支持目录树可复现嗅探、Open Issues 真实踩坑雷达、四大领域专业探针、本地环境画像碰撞与 BYOK 大模型引证精排
            </p>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setSearchMode('nl')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                searchMode === 'nl' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              💬 自然语言找项目
            </button>
            <button
              onClick={() => setSearchMode('repo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                searchMode === 'repo' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔗 粘贴仓库找替代/互补
            </button>
          </div>
        </div>

        {/* 模式 A：自然语言搜索 */}
        {searchMode === 'nl' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-400 self-center">💡 快捷用例:</span>
              {sampleQueries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputQuery(q);
                    handleSearch(q);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 transition truncate max-w-xs"
                >
                  {q.slice(0, 24)}...
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={inputQuery}
                onChange={e => setInputQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch(inputQuery)}
                placeholder="例如：找能下载宏观数据、做面板回归、输出 LaTeX 表格的 Python 项目..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 text-sm"
              />
              <button
                onClick={() => handleSearch(inputQuery)}
                disabled={isSearching}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-sky-500/25 transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                <Search className="w-4 h-4" />
                <span>{isSearching ? '检索中...' : '智能搜索'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 模式 B：以仓找仓 */}
        {searchMode === 'repo' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center text-xs">
              <span className="text-slate-400">检索目标关系：</span>
              {(['alternative', 'lightweight', 'complementary'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setRelationMode(m)}
                  className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                    relationMode === m
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {m === 'alternative' ? '🔄 寻找同位替代品' : m === 'lightweight' ? '🪶 寻找更轻量版本' : '🧩 寻找上下游互补模块'}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={repoUrlInput}
                onChange={e => setRepoUrlInput(e.target.value)}
                placeholder="输入 GitHub 仓库 URL，例如: https://github.com/bashtage/linearmodels"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
              <button
                onClick={handleUrlRelationSearch}
                disabled={isSearching}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>{isSearching ? '分析关系中...' : '关系定向检索'}</span>
              </button>
            </div>
          </div>
        )}

        {relationDesc && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs rounded-xl flex items-center space-x-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{relationDesc}</span>
          </div>
        )}

        {statusMessage && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl animate-fade-in flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* 结构化条件卡片 & 快捷操作栏 */}
        {parsed && (
          <div className="pt-3 border-t border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-slate-400">提取硬性约束:</span>
              {parsed.llm_enhanced && (
                <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center space-x-1">
                  <BrainCircuit className="w-3 h-3" />
                  <span>BYOK大模型裂变</span>
                </span>
              )}
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-400">
                目标: {parsed.target || '通用'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400">
                语言: {parsed.target_languages.join(', ') || '不限'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-400">
                环境: {parsed.environments.join(', ') || '跨平台'}
              </span>
              {parsed.required_capabilities.map((c, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-300">
                  ⚡ {c}
                </span>
              ))}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleDeepInspectTop}
                disabled={isDeepInspecting}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition disabled:opacity-50"
              >
                <FileSearch className="w-3.5 h-3.5" />
                <span>
                  {isDeepInspecting
                    ? `深挖骨架与Issue中 (${inspectProgress?.current}/${inspectProgress?.total})...`
                    : '🔬 一键深水区取证前 4 项 (目录树+Issue+领域探针)'}
                </span>
              </button>

              <button
                onClick={handleSaveAsSubscription}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                title="将当前检索词建立为持续监控订阅"
              >
                <BellRing className="w-3.5 h-3.5 text-amber-400" />
                <span>存为订阅</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 三层分组结果列表 */}
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
                  <span>
                    {group === '较完整方案' ? '🌟' : group === '可组合模块' ? '🧩' : '🔍'} {group}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {results[activeResultGroup].length === 0 ? (
              <div className="p-12 text-center bg-slate-800/30 border border-slate-800 rounded-2xl text-slate-400">
                此分层暂无匹配项。建议查看其他分层或调整需求。
              </div>
            ) : (
              results[activeResultGroup].map((item, idx) => {
                const r = item.repository;
                const a = item.analysis;
                const isCompared = compareList.some(c => c.repo.github_id === r.github_id);
                const probe = a.domain_probe;

                return (
                  <div
                    key={idx}
                    className="p-5 bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/70 hover:border-sky-500/50 rounded-2xl transition shadow-lg space-y-3.5"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
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
                            匹配得分: {item.match_score}
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

                          {a.is_deep_inspected ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>
                                已深水区取证 (SHA: {a.commit_sha || a.readme_hash?.slice(0, 6) || 'latest'})
                              </span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDeepInspectSingle(r)}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center space-x-1 transition"
                            >
                              <FileSearch className="w-3 h-3" />
                              <span>深挖目录树与Issue</span>
                            </button>
                          )}
                        </div>

                        <p className="text-sm text-slate-200 leading-relaxed font-medium">{a.chinese_purpose}</p>
                      </div>

                      {/* 卡片右侧动作 */}
                      <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-2">
                        {probe?.academic_metadata?.bibtex_snippet && (
                          <button
                            onClick={() => handleCopyBibtex(probe.academic_metadata!.bibtex_snippet!, r.name)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium transition"
                            title="一键复制标准 BibTeX 学术引用条目"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>复制 BibTeX</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleSaveToCollection(r, a)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-medium transition"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5" />
                          <span>加入收藏</span>
                        </button>

                        <button
                          onClick={() => onAddToCompare(r, a)}
                          disabled={isCompared}
                          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
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

                    {/* V0.3 本地环境画像碰撞红黄绿灯条 */}
                    {a.env_alerts && a.env_alerts.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {a.env_alerts.map((al, ai) => (
                          <span
                            key={ai}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium flex items-center space-x-1.5 ${
                              al.level === 'danger'
                                ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                                : al.level === 'warning'
                                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            }`}
                          >
                            {al.level === 'danger' ? (
                              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            ) : al.level === 'warning' ? (
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>{al.reason}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* V0.3 四大垂直领域专属探针与目录树骨架徽标 */}
                    {(probe || a.tree_insight) && (
                      <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/90 flex flex-wrap items-center gap-2 text-[11px]">
                        {probe && probe.domain !== '通用' && (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                            🎯 领域探针: {probe.domain}
                          </span>
                        )}

                        {/* 金融经济探针 */}
                        {probe?.data_source_type && (
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-sky-300">
                            📊 数据源: {probe.data_source_type}
                          </span>
                        )}
                        {probe?.econometric_features?.map((ef, efi) => (
                          <span key={efi} className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                            📈 {ef}
                          </span>
                        ))}

                        {/* 量化交易探针 */}
                        {probe?.quant_authenticity && (
                          <>
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300">
                              ⚙️ 架构: {probe.quant_authenticity.engine_type}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded ${
                                probe.quant_authenticity.has_commission_slippage
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {probe.quant_authenticity.has_commission_slippage
                                ? '✓ 含手续费/滑点建模证据'
                                : '手续费/滑点未见明文'}
                            </span>
                            {probe.quant_authenticity.lookahead_guard && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                                ✓ 防未来函数/PIT声明
                              </span>
                            )}
                          </>
                        )}

                        {/* 学术研究探针 */}
                        {probe?.academic_metadata?.arxiv_id && (
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                            📄 arXiv: {probe.academic_metadata.arxiv_id}
                          </span>
                        )}
                        {probe?.academic_metadata?.doi && (
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                            🔗 DOI: {probe.academic_metadata.doi}
                          </span>
                        )}

                        {/* 视觉与媒体探针 */}
                        {probe?.media_license_split && (
                          <>
                            <span
                              className={`px-2 py-0.5 rounded ${
                                probe.media_license_split.weight_commercial_safe === '可商用'
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : probe.media_license_split.weight_commercial_safe === '非商用/受限'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              ⚖️ 权重商用性: {probe.media_license_split.weight_commercial_safe}
                            </span>
                            {probe.media_license_split.min_vram_gb && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                                🎮 最低显存水位: &gt;= {probe.media_license_split.min_vram_gb}GB VRAM
                              </span>
                            )}
                          </>
                        )}

                        {/* 目录树可复现骨架 */}
                        {a.tree_insight && a.tree_insight.detected_artifacts.length > 0 && (
                          <div className="flex items-center flex-wrap gap-1.5 pl-1">
                            <FolderTree className="w-3.5 h-3.5 text-sky-400" />
                            {a.tree_insight.detected_artifacts.map((art, arti) => (
                              <span
                                key={arti}
                                className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30"
                              >
                                {art}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 依赖清单与环境证据 */}
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400">操作系统支持证据:</span>
                        <span
                          className={
                            a.os_compatibility.Windows === '支持' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
                          }
                        >
                          Win: {a.os_compatibility.Windows}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span
                          className={
                            a.os_compatibility.Linux === '支持' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
                          }
                        >
                          Linux: {a.os_compatibility.Linux}
                        </span>
                        <span className="text-slate-600">|</span>
                        <span
                          className={
                            a.os_compatibility.macOS === '支持' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
                          }
                        >
                          macOS: {a.os_compatibility.macOS}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400">GPU算力:</span>
                        <span className="text-slate-200">{a.gpu_requirement}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400">维护状态:</span>
                        <span className={a.maintenance_status === '活跃' ? 'text-emerald-400' : 'text-amber-400'}>
                          {a.maintenance_status}
                        </span>
                      </div>

                      {a.external_dependencies && a.external_dependencies.length > 0 && (
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="text-slate-400">核心依赖:</span>
                          {a.external_dependencies.slice(0, 6).map((dep, di) => (
                            <span
                              key={di}
                              className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-sky-300"
                            >
                              {dep}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* V0.3 社区真实踩坑 Issue 雷达 */}
                    {a.issue_pain_points && a.issue_pain_points.length > 0 && (
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-xs">
                        <div className="font-semibold text-amber-300 flex items-center space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>社区真实避坑雷达 (Open Issues 实时扫描):</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {a.issue_pain_points.map(iss => (
                            <a
                              key={iss.number}
                              href={iss.html_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded bg-slate-950/70 hover:bg-slate-900 border border-amber-500/20 flex items-center justify-between text-[11px] text-slate-300 transition"
                            >
                              <span className="truncate">
                                <strong className="text-amber-400">[{iss.category}]</strong> #{iss.number} {iss.title}
                              </span>
                              <ExternalLink className="w-3 h-3 shrink-0 ml-1 opacity-60" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 满足与存疑清单 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                      {item.matched_reasons.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>确认满足项:</span>
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
                            <span>存疑或未查到明文证据:</span>
                          </span>
                          <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                            {item.unmatched_reasons.map((ur, i) => (
                              <li key={i}>{ur}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* 原文证据片段 & BYOK 大模型强制引证核验结果 */}
                    {a.llm_grounded_quotes && a.llm_grounded_quotes.length > 0 && (
                      <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-1 text-[11px]">
                        <div className="text-purple-300 font-semibold flex items-center space-x-1">
                          <BrainCircuit className="w-3.5 h-3.5" />
                          <span>BYOK 大模型原文强制引证核验:</span>
                        </div>
                        {a.llm_grounded_quotes.map((gq, gi) => (
                          <div key={gi} className="text-slate-300 flex items-start space-x-2">
                            <span className={gq.verified ? 'text-emerald-400 shrink-0' : 'text-rose-400 shrink-0'}>
                              {gq.verified ? '[✓ 原文已核实]' : '[✗ 未查到原文/拦截]'}
                            </span>
                            <span>
                              <strong>{gq.claim}</strong> — <code className="text-slate-400">"{gq.exact_quote}"</code>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {a.evidence_snippets && a.evidence_snippets.length > 0 && (
                      <div className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-2.5 rounded-lg border border-slate-900 truncate">
                        {a.evidence_snippets[0]}
                      </div>
                    )}

                    {/* 快捷关系探索与工作流组装按钮栏 */}
                    <div className="pt-2 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400">以该仓探索:</span>
                        <button
                          onClick={() => handleRelationSearch(r, 'alternative')}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-sky-400" />
                          <span>找替代品</span>
                        </button>
                        <button
                          onClick={() => handleRelationSearch(r, 'lightweight')}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1"
                        >
                          <span>🪶 找更轻量版</span>
                        </button>
                        <button
                          onClick={() => handleRelationSearch(r, 'complementary')}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1"
                        >
                          <Puzzle className="w-3 h-3 text-indigo-400" />
                          <span>找上下游互补</span>
                        </button>
                      </div>

                      <button
                        onClick={() => onOpenComposer(r, a)}
                        className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium transition"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>装入研究工作流 & 导出脚手架</span>
                      </button>
                    </div>
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
