import type { ParsedQuery, Repository, EvidenceAnalysis, SearchResultItem } from '../types/index.ts';

// 中英双语能力词典：用于查询解析 + 英文 GitHub 仓库跨语言打分匹配
export const BILINGUAL_CAPABILITY_MAP: [string, string[]][] = [
  ['宏观数据', ['宏观数据', '经济数据', 'cpi', 'gdp', '统计局', 'financial data', 'macroeconomic', 'macro', 'fred', 'world bank', 'akshare', 'yfinance', 'baostock', 'tushare']],
  ['面板回归', ['面板回归', '固定效应', '随机效应', 'panel regression', 'panel data', 'fixed effects', 'twfe', 'random effects', 'econometrics', 'linearmodels', 'pyfixest', 'statsmodels', 'feols']],
  ['因果推断', ['因果推断', 'did', '双重差分', '断点回归', 'iv2sls', '工具变量', 'causal', 'causality', 'difference-in-differences', 'instrumental variable', 'synthetic control', 'dowhy', 'econml', 'causalml']],
  ['LaTeX表格', ['latex', 'latex表格', '排版', '导出表格', 'stargazer', 'typst', 'summary_col', 'tex', 'bibtex', 'typesetting', 'academic table', 'publication']],
  ['策略回测', ['回测', 'backtest', 'backtesting', 'cta', '量化交易', 'algo trading', 'algorithmic trading', 'quantitative', 'vnpy', 'backtrader', 'vectorbt', 'zipline', 'freqtrade', 'nautilus']],
  ['因子研究', ['alpha', '因子', 'factor', 'qlib', 'alphalens', 'feature engineering', 'ic', 'rankic', 'cross-sectional']],
  ['行情接入', ['行情', 'ctp', 'ccxt', 'market data', 'orderbook', 'tick', 'websocket', 'broker', 'exchange', 'trading api']],
  ['组合优化', ['组合优化', '风险管理', 'portfolio', 'optimization', 'risk', 'sharpe', 'cvar', 'mean-variance', 'pypfopt', 'riskfolio']],
  ['代码动画', ['动画', 'manim', '3blue1brown', '动态图表', 'animation', 'mathematical animation', 'visualization', 'cairo', 'motion']],
  ['自动字幕', ['字幕', 'whisper', '语音识别', 'asr', 'srt', 'transcription', 'subtitle', 'speech-to-text', 'faster-whisper', 'whisperx']],
  ['AI配音', ['配音', 'tts', 'text-to-speech', 'voice', 'speech synthesis', 'cosyvoice', 'chattts', 'bark', 'f5-tts']],
  ['PDF解析', ['pdf', '论文提取', 'pdf解析', 'pymupdf', 'pdfplumber', 'mineru', 'marker', 'nougat', 'ocr', 'document extraction', 'markdown']],
  ['文献管理', ['文献', '参考文献', 'citation', 'bibtex', 'zotero', 'arxiv', 'scholar', 'literature', 'paper']],
  ['图像生成', ['sd', 'stable diffusion', 'comfyui', '图像生成', '生图', 'diffusion', 'flux', 'image generation', 'controlnet']],
  ['视频剪辑', ['剪辑', 'moviepy', '合成视频', '音视频', 'ffmpeg', 'video editing', 'video processing']],
];

export function parseNaturalLanguageQuery(text: string): ParsedQuery {
  const clean = text.trim();
  const parsed: ParsedQuery = {
    original_query: clean,
    target: '',
    required_capabilities: [],
    preferences: [],
    environments: [],
    exclusions: [],
    target_languages: [],
    generated_github_queries: [],
  };

  // 1. 语言抽取
  if (/\bpython\b/i.test(clean)) parsed.target_languages.push('Python');
  if (/\brust\b/i.test(clean)) parsed.target_languages.push('Rust');
  if (/\br\b|r语言/i.test(clean)) parsed.target_languages.push('R');
  if (/\bc\+\+\b/i.test(clean)) parsed.target_languages.push('C++');
  if (/\btypescript\b|ts\b/i.test(clean)) parsed.target_languages.push('TypeScript');

  // 2. 环境抽取
  if (/windows|win\b|win10|win11/i.test(clean)) parsed.environments.push('Windows');
  if (/linux|ubuntu/i.test(clean)) parsed.environments.push('Linux');
  if (/macos|mac\b|apple silicon/i.test(clean)) parsed.environments.push('macOS');
  if (/gpu|cuda|显卡/i.test(clean)) parsed.environments.push('GPU');

  // 3. 排除条件
  const excludeMatches = clean.match(/(?:不要|无需|不要有|排除|免)(付费[^\s，,。]+|api key|外挂[^\s，,。]+)/gi);
  if (excludeMatches) {
    parsed.exclusions = excludeMatches.map(m => m.replace(/不要|无需|不要有|排除|免/i, '').trim());
  }

  // 4. 偏好
  if (/轻量|简单|小而美|无依赖/i.test(clean)) parsed.preferences.push('轻量简单');
  if (/gui|图形界面|桌面端|web/i.test(clean)) parsed.preferences.push('有图形界面');

  // 5. 核心能力抽取
  for (const [name, kws] of BILINGUAL_CAPABILITY_MAP) {
    if (kws.some(kw => clean.toLowerCase().includes(kw))) {
      parsed.required_capabilities.push(name);
    }
  }

  parsed.target =
    clean.replace(/我想找|能否|最好能|可以|在|上运行|的项目/g, '').trim().slice(0, 35) || clean.slice(0, 35);

  // 扩展多组正交英文检索词
  const queries: string[] = [];
  const lang = parsed.target_languages[0] ? ` language:${parsed.target_languages[0].toLowerCase()}` : '';

  if (parsed.required_capabilities.includes('宏观数据') || parsed.required_capabilities.includes('面板回归')) {
    queries.push(`panel data econometrics${lang}`);
    queries.push(`financial macroeconomic data${lang}`);
  }
  if (parsed.required_capabilities.includes('因果推断')) {
    queries.push(`causal inference econometrics${lang}`);
  }
  if (parsed.required_capabilities.includes('LaTeX表格')) {
    queries.push(`latex regression table econometrics${lang}`);
  }
  if (parsed.required_capabilities.includes('代码动画')) {
    queries.push(`manim animation mathematical${lang}`);
  }
  if (parsed.required_capabilities.includes('自动字幕')) {
    queries.push(`whisper subtitle transcription${lang}`);
  }
  if (parsed.required_capabilities.includes('AI配音')) {
    queries.push(`tts speech synthesis voice${lang}`);
  }
  if (parsed.required_capabilities.includes('PDF解析')) {
    queries.push(`pdf extraction markdown table${lang}`);
  }
  if (parsed.required_capabilities.includes('策略回测') || parsed.required_capabilities.includes('行情接入')) {
    queries.push(`quantitative trading backtesting${lang}`);
    queries.push(`algorithmic trading framework${lang}`);
  }
  if (parsed.required_capabilities.includes('因子研究') || parsed.required_capabilities.includes('组合优化')) {
    queries.push(`quantitative finance alpha factor portfolio${lang}`);
  }
  if (queries.length === 0) {
    queries.push(`${parsed.target}${lang}`);
  }

  parsed.generated_github_queries = Array.from(new Set(queries)).slice(0, 3);
  return parsed;
}

/**
 * 方向二：以仓找仓（构建替代品、更轻量版本、互补模块查询词）
 */
export function buildRelationQueries(
  seedRepo: Repository,
  mode: 'alternative' | 'lightweight' | 'complementary'
): { queries: string[]; filterDesc: string } {
  const lang = seedRepo.language ? ` language:${seedRepo.language.toLowerCase()}` : '';
  const topicsStr = seedRepo.topics.slice(0, 2).join(' ');

  if (mode === 'alternative') {
    const q1 = `${seedRepo.name} alternative${lang}`.trim();
    const q2 = `${topicsStr || seedRepo.name} ${seedRepo.language || ''}`.trim();
    return {
      queries: [q1, q2],
      filterDesc: `寻找 ${seedRepo.name} 的同生态位直接替代品 (同能力、同技术栈)`,
    };
  }

  if (mode === 'lightweight') {
    const q1 = `${topicsStr || seedRepo.name} lightweight minimal${lang}`.trim();
    const q2 = `${topicsStr || seedRepo.name} pure python zero dependency`.trim();
    return {
      queries: [q1, q2],
      filterDesc: `寻找 ${seedRepo.name} 的轻量化、少依赖替代版本`,
    };
  }

  const nameLower = seedRepo.name.toLowerCase();
  const descLower = (seedRepo.description || '').toLowerCase();

  let compQuery = '';
  let compDesc = '';

  if (
    nameLower.includes('linear') ||
    nameLower.includes('statsmodels') ||
    descLower.includes('econometric') ||
    descLower.includes('regression') ||
    descLower.includes('causal inference')
  ) {
    compQuery = `macro data python OR regression table latex${lang}`;
    compDesc = `为计量库 ${seedRepo.name} 匹配上游数据源与下游 LaTeX/表格导出模块`;
  } else if (
    nameLower.includes('akshare') ||
    nameLower.includes('yfinance') ||
    descLower.includes('data interface') ||
    descLower.includes('financial data') ||
    descLower.includes('macro data') ||
    descLower.includes('crawler')
  ) {
    compQuery = `panel regression econometrics OR backtesting${lang}`;
    compDesc = `为数据获取库 ${seedRepo.name} 匹配下游计量分析与回测估计模块`;
  } else if (nameLower.includes('whisper') || descLower.includes('audio') || descLower.includes('speech')) {
    compQuery = `video editing moviepy OR animation${lang}`;
    compDesc = `为字幕转录库 ${seedRepo.name} 匹配下游视频剪辑与画面合成模块`;
  } else if (nameLower.includes('backtest') || nameLower.includes('vnpy') || descLower.includes('trading')) {
    compQuery = `alpha factor market data feed${lang}`;
    compDesc = `为回测引擎 ${seedRepo.name} 匹配上游行情接入与 Alpha 因子库`;
  } else {
    compQuery = `visualization export table ${seedRepo.language || ''}`.trim();
    compDesc = `为 ${seedRepo.name} 匹配可视化呈现与结果导出模块`;
  }

  return {
    queries: [compQuery],
    filterDesc: compDesc,
  };
}

export function scoreAndTriage(
  candidates: { repo: Repository; analysis: EvidenceAnalysis }[],
  query: ParsedQuery
): { '较完整方案': SearchResultItem[]; '可组合模块': SearchResultItem[]; '部分满足需求': SearchResultItem[] } {
  const complete: SearchResultItem[] = [];
  const modular: SearchResultItem[] = [];
  const partial: SearchResultItem[] = [];

  // 提取原始查询中的英文词与中文二元词，用于过滤完全无关的领域的本地种子
  const rawTokens = query.original_query
    .toLowerCase()
    .split(/[\s,，。、/|+]+/)
    .filter(t => t.length >= 2);

  for (const { repo, analysis } of candidates) {
    let score = 38;
    const matched: string[] = [];
    const unmatched: string[] = [];

    const textCorpus = `${repo.full_name} ${repo.description} ${repo.topics.join(' ')} ${analysis.chinese_purpose} ${analysis.satisfied_conditions.join(' ')}`.toLowerCase();

    // 1. 语言匹配
    if (query.target_languages.length > 0) {
      if (repo.language && repo.language.toLowerCase() === query.target_languages[0].toLowerCase()) {
        score += 18;
        matched.push(`编程语言契合: ${repo.language}`);
      } else {
        score -= 10;
        unmatched.push(`语言不一致 (当前: ${repo.language || '未知'}, 需求: ${query.target_languages[0]})`);
      }
    }

    // 2. 核心能力中英双语跨语言匹配（解决实时搜回的英文 GitHub 仓库无法命中中文能力词的问题）
    let hitCapCount = 0;
    for (const cap of query.required_capabilities) {
      const bilingualEntry = BILINGUAL_CAPABILITY_MAP.find(([name]) => name === cap);
      const synonyms = bilingualEntry ? bilingualEntry[1] : [cap.toLowerCase()];

      if (
        textCorpus.includes(cap.toLowerCase()) ||
        synonyms.some(syn => textCorpus.includes(syn.toLowerCase()))
      ) {
        hitCapCount++;
        matched.push(`命中核心能力: ${cap}`);
      } else {
        unmatched.push(`未确认支持: ${cap}`);
      }
    }

    if (query.required_capabilities.length > 0) {
      // 命中至少 1 项核心能力即给予基础分，命中多项给予高额叠加奖励
      if (hitCapCount > 0) {
        score += 15 + (hitCapCount / query.required_capabilities.length) * 22;
      } else {
        score -= 12;
      }
    } else {
      // 当用户输入自由查询未触发预设能力词时，用关键词与仓库语料匹配
      const tokenHits = rawTokens.filter(tk => textCorpus.includes(tk)).length;
      if (tokenHits > 0) {
        score += Math.min(30, tokenHits * 12);
        matched.push(`命中检索关键词 (${tokenHits} 处)`);
      }
    }

    // 3. Windows 环境契合
    if (query.environments.includes('Windows')) {
      if (analysis.os_compatibility.Windows === '支持') {
        score += 12;
        matched.push('确凿证据支持 Windows 运行');
      } else if (analysis.os_compatibility.Windows === '不支持') {
        score -= 25;
        unmatched.push('明确不支持 Windows');
      } else {
        // 对于跨平台纯 Python/Rust/JS 库，未显式提 Windows 不扣分，仅提示存疑
        if (['python', 'typescript', 'javascript', 'rust', 'r'].includes((repo.language || '').toLowerCase())) {
          score += 5;
        }
        unmatched.push('Windows 兼容性未见明文提及 (存疑未知，可点击深挖取证)');
      }
    }

    // 4. Star 质量与维护度加分
    if (repo.stars > 0) {
      score += Math.min(12, Math.log10(repo.stars + 1) * 2.5);
    }

    // 5. 深度取证加分
    if (analysis.is_deep_inspected) {
      score += 5;
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    let groupName: '较完整方案' | '可组合模块' | '部分满足需求';
    if (finalScore >= 72) {
      groupName = '较完整方案';
    } else if (finalScore >= 54) {
      groupName = '可组合模块';
    } else {
      groupName = '部分满足需求';
    }

    const item: SearchResultItem = {
      repository: repo,
      analysis,
      match_score: finalScore,
      match_group: groupName,
      matched_reasons: matched,
      unmatched_reasons: unmatched,
    };

    if (groupName === '较完整方案') complete.push(item);
    else if (groupName === '可组合模块') modular.push(item);
    else partial.push(item);
  }

  complete.sort((a, b) => b.match_score - a.match_score);
  modular.sort((a, b) => b.match_score - a.match_score);
  partial.sort((a, b) => b.match_score - a.match_score);

  return { '较完整方案': complete, '可组合模块': modular, '部分满足需求': partial };
}
