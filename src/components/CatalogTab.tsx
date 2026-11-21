import React, { useState, useEffect } from 'react';
import { TAXONOMY, SEED_ITEMS } from '../data/seedData';
import { ExternalLink, BookmarkPlus, Sparkles, FolderInput, CheckCircle2 } from 'lucide-react';
import { StorageService, CustomCatalogEntry } from '../services/storageService';
import { GitHubService } from '../services/githubService';
import { GistSyncService } from '../services/gistSyncService';
import { AwesomeImportedCandidate, Repository, EvidenceAnalysis } from '../types';
import { EvidenceExtractor } from '../services/evidenceExtractor';

export const CatalogTab: React.FC = () => {
  const domains = Object.keys(TAXONOMY) as (keyof typeof TAXONOMY)[];
  const [selectedDomain, setSelectedDomain] = useState<keyof typeof TAXONOMY>(domains[1]); // 金融与经济研究
  const [selectedSubcat, setSelectedSubcat] = useState<string>('全部');
  const [customEntries, setCustomEntries] = useState<CustomCatalogEntry[]>([]);
  const [toast, setToast] = useState('');

  // V0.3 Awesome 清单批量导入状态
  const [showAwesomeImporter, setShowAwesomeImporter] = useState(false);
  const [awesomeInput, setAwesomeInput] = useState('wilsonfreitas/awesome-quant');
  const [isParsingAwesome, setIsParsingAwesome] = useState(false);
  const [isDiscoveringLive, setIsDiscoveringLive] = useState(false);
  const [parsedCandidates, setParsedCandidates] = useState<AwesomeImportedCandidate[]>([]);

  useEffect(() => {
    setCustomEntries(StorageService.getCustomCatalogItems());
  }, []);

  const subcats = ['全部', ...TAXONOMY[selectedDomain]];

  const allCatalogItems = [...SEED_ITEMS, ...customEntries];
  const filteredItems = allCatalogItems.filter(item => {
    if (item.domain !== selectedDomain) return false;
    if (selectedSubcat !== '全部' && item.subcategory !== selectedSubcat) return false;
    return true;
  });

  const handleCollect = (item: { repo: Repository; analysis: EvidenceAnalysis }) => {
    StorageService.saveItem(item.repo, item.analysis, '待评估');
    setToast(`已收藏 ${item.repo.name} 到评估漏斗库`);
    setTimeout(() => setToast(''), 3000);
  };

  const handleParseAwesome = async () => {
    if (!awesomeInput.trim()) return;
    setIsParsingAwesome(true);
    setParsedCandidates([]);

    let candidates: AwesomeImportedCandidate[] = [];
    if (awesomeInput.includes('\n') || awesomeInput.includes('](')) {
      // 用户直接粘贴了包含链接的 Markdown 文本
      candidates = GistSyncService.parseAwesomeMarkdown(awesomeInput);
    } else {
      // 用户输入了 GitHub Awesome 仓库路径或 URL
      candidates = await GitHubService.fetchAwesomeListCandidates(awesomeInput);
    }

    setParsedCandidates(candidates);
    setIsParsingAwesome(false);
    if (candidates.length === 0) {
      setToast('未能从该地址解析出 GitHub 仓库链接，可尝试直接粘贴含 GitHub 链接的 Markdown 文本');
      setTimeout(() => setToast(''), 3500);
    }
  };

  const handleBatchImportAwesome = () => {
    if (parsedCandidates.length === 0) return;
    const nowIso = new Date().toISOString();
    const newEntries: CustomCatalogEntry[] = parsedCandidates.map((c, idx) => {
      const repo: Repository = {
        github_id: Date.now() + idx,
        full_name: c.full_name,
        owner: c.owner,
        name: c.name,
        description: c.description,
        html_url: c.html_url,
        stars: 500,
        language: 'Python',
        license_spdx: '开源协议',
        pushed_at: nowIso,
        topics: [c.inferred_subcategory],
      };

      const analysis = EvidenceExtractor.extractFromReadme(repo, c.description);
      analysis.is_deep_inspected = false;

      return {
        domain: c.inferred_domain,
        subcategory: c.inferred_subcategory,
        capability: 'Awesome导入',
        modality: '工具库',
        repo,
        analysis,
      };
    });

    const addedCount = StorageService.saveCustomCatalogItems(newEntries);
    setCustomEntries(StorageService.getCustomCatalogItems());
    setParsedCandidates([]);
    setShowAwesomeImporter(false);
    setToast(`成功从 Awesome 清单批量导入 ${addedCount} 个新开源仓库到四大领域目录！`);
    setTimeout(() => setToast(''), 4000);
  };

  // 按当前领域与子分类实时向 GitHub 搜索拉取 15 个高星项目扩充目录
  const handleDiscoverCategoryLive = async () => {
    setIsDiscoveringLive(true);
    const subQueryMap: Record<string, string> = {
      '文献发现': 'academic literature review search rag python',
      '参考文献管理': 'bibtex citation zotero latex academic',
      'PDF阅读与解析': 'pdf table formula extraction markdown python',
      '研究复现': 'reproducible research jupyter quarto latex',
      'LaTeX工具与模版': 'latex template typesetting academic paper',
      '学术图表与演示': 'scientific visualization matplotlib plots python',
      '宏观与金融数据': 'macroeconomic financial market data api python',
      '因果推断': 'causal inference did econometrics python',
      '面板计量': 'panel data fixed effects econometrics python',
      '资产定价': 'asset pricing factor model volatility econometrics python',
      '公司金融': 'corporate finance sec edgar financial statements python',
      '财经文本分析': 'financial sentiment analysis nlp finance python',
      '行情接入': 'market data feed exchange orderbook trading api python',
      '因子研究': 'alpha factor quantitative investment research python',
      '策略回测': 'quantitative trading backtesting engine python',
      '组合优化': 'portfolio optimization mean variance risk parity python',
      '风险管理': 'quantitative risk management cvar drawdown portfolio python',
      '模拟交易': 'paper trading algorithmic trading bot python',
      '图像生成与编辑': 'diffusion image generation editing inpainting python',
      '视频剪辑': 'video editing compositing ffmpeg python',
      '代码动画': 'mathematical animation manim visualization python',
      'AI配音与TTS': 'tts voice synthesis zero-shot speech python',
      '自动字幕': 'whisper subtitle transcription speech recognition python',
      '创作工作流编排': 'comfyui node workflow diffusion pipeline',
    };

    const defaultDomainQuery: Record<string, string> = {
      '学术研究': 'academic research latex pdf python',
      '金融与经济研究': 'econometrics panel data finance python',
      '量化交易': 'quantitative trading backtesting alpha python',
      '视频与图片创作': 'manim whisper video animation python',
    };

    const targetSubcat = selectedSubcat === '全部' ? TAXONOMY[selectedDomain][0] : selectedSubcat;
    const ghQuery =
      selectedSubcat === '全部'
        ? defaultDomainQuery[selectedDomain]
        : subQueryMap[selectedSubcat] || `${selectedSubcat} python`;

    const fetched = await GitHubService.searchRemote(ghQuery, 15);
    const newEntries: CustomCatalogEntry[] = fetched.map(item => ({
      domain: selectedDomain,
      subcategory: targetSubcat,
      capability: 'GitHub实时发现',
      modality: '开源仓库',
      repo: item.repo,
      analysis: item.analysis,
    }));

    const added = StorageService.saveCustomCatalogItems(newEntries);
    setCustomEntries(StorageService.getCustomCatalogItems());
    setIsDiscoveringLive(false);
    setToast(`已从 GitHub 实时抓取并为【${selectedDomain} · ${selectedSubcat}】补充了 ${added} 个新开源项目！`);
    setTimeout(() => setToast(''), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1 flex items-center space-x-2">
              <span>📚 垂直领域目录</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 font-normal">
                共收录 {allCatalogItems.length} 个精选项目
              </span>
            </h2>
            <p className="text-sm text-slate-400">
              按四大领域精准分类索引，支持一键解析任意 GitHub Awesome 清单批量扩充本地领域知识库。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleDiscoverCategoryLive}
              disabled={isDiscoveringLive}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isDiscoveringLive ? '正在实时拉取...' : `🌐 从 GitHub 实时补充「${selectedSubcat === '全部' ? selectedDomain : selectedSubcat}」(+15)`}</span>
            </button>

            <button
              onClick={() => setShowAwesomeImporter(!showAwesomeImporter)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
            >
              <FolderInput className="w-4 h-4" />
              <span>{showAwesomeImporter ? '收起 Awesome 导入器' : '🚀 Awesome 清单批量导入'}</span>
            </button>
          </div>
        </div>

        {/* V0.3 Awesome 清单批量吞吐面板 */}
        {showAwesomeImporter && (
          <div className="mb-6 p-4 bg-slate-950/80 border border-indigo-500/30 rounded-xl space-y-3 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-indigo-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>输入 Awesome 仓库地址或直接粘贴含 GitHub 链接的 Markdown 清单：</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '量化: awesome-quant', val: 'wilsonfreitas/awesome-quant' },
                  { label: '经济: awesome-economics', val: 'antontarasenko/awesome-economics' },
                  { label: '因果: awesome-causal-inference', val: 'rguo12/awesome-causality-algorithms' },
                ].map(preset => (
                  <button
                    key={preset.val}
                    onClick={() => setAwesomeInput(preset.val)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-slate-700"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={awesomeInput}
                onChange={e => setAwesomeInput(e.target.value)}
                placeholder="例如: wilsonfreitas/awesome-quant 或 https://github.com/..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
              <button
                onClick={handleParseAwesome}
                disabled={isParsingAwesome}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {isParsingAwesome ? '正在抓取解析...' : '⚡ 自动解析并分类'}
              </button>
            </div>

            {parsedCandidates.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 font-semibold">
                    ✓ 已识别出 {parsedCandidates.length} 个独立 GitHub 仓库并完成四大领域自动归类
                  </span>
                  <button
                    onClick={handleBatchImportAwesome}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center space-x-1 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>📥 一键全部导入本地目录库</span>
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                  {parsedCandidates.slice(0, 24).map((c, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="font-bold text-white">{c.full_name}</span>
                        <span className="text-slate-400 ml-1.5">{c.description}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 shrink-0">
                        {c.inferred_domain} · {c.inferred_subcategory}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
            key={`${item.repo.github_id}_${item.repo.full_name}`}
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
