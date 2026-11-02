import { ParsedQuery, Repository, EvidenceAnalysis, SearchResultItem } from '../types';

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
  if (/轻量|简单|小而美/i.test(clean)) parsed.preferences.push('轻量简单');
  if (/gui|图形界面|桌面端/i.test(clean)) parsed.preferences.push('有图形界面');

  // 5. 能力抽取
  const capMap: [string, string[]][] = [
    ['宏观数据', ['宏观数据', '经济数据', 'cpi', 'gdp', '统计局']],
    ['面板回归', ['面板回归', '固定效应', '随机效应', 'panel regression', 'panel data']],
    ['因果推断', ['因果推断', 'did', '双重差分', '断点回归', 'iv2sls', '工具变量']],
    ['LaTeX表格', ['latex', 'latex表格', '排版', '导出表格']],
    ['策略回测', ['回测', 'backtest', 'cta', '量化交易']],
    ['代码动画', ['动画', 'manim', '3blue1brown', '动态图表']],
    ['自动字幕', ['字幕', 'whisper', '语音识别', 'asr', 'srt']],
    ['PDF解析', ['pdf', '论文提取', 'pdf解析']],
  ];

  for (const [name, kws] of capMap) {
    if (kws.some(kw => clean.toLowerCase().includes(kw))) {
      parsed.required_capabilities.push(name);
    }
  }

  parsed.target = clean.replace(/我想找|能否|最好能|可以|在|上运行|的项目/g, '').trim().slice(0, 35) || clean.slice(0, 35);

  // 扩展英文检索词
  const queries: string[] = [];
  const lang = parsed.target_languages[0] ? ` language:${parsed.target_languages[0].toLowerCase()}` : '';
  if (parsed.required_capabilities.includes('宏观数据') || parsed.required_capabilities.includes('面板回归')) {
    queries.push(`panel regression econometrics${lang}`);
    queries.push(`macroeconomic data python${lang}`);
  }
  if (parsed.required_capabilities.includes('代码动画')) {
    queries.push(`mathematical animation code${lang}`);
  }
  if (parsed.required_capabilities.includes('自动字幕')) {
    queries.push(`speech recognition subtitle srt${lang}`);
  }
  if (parsed.required_capabilities.includes('PDF解析')) {
    queries.push(`pdf extraction markdown${lang}`);
  }
  if (queries.length === 0) {
    queries.push(`${parsed.target}${lang}`);
  }

  parsed.generated_github_queries = Array.from(new Set(queries)).slice(0, 3);
  return parsed;
}

export function scoreAndTriage(
  candidates: { repo: Repository; analysis: EvidenceAnalysis }[],
  query: ParsedQuery
): { '较完整方案': SearchResultItem[]; '可组合模块': SearchResultItem[]; '部分满足需求': SearchResultItem[] } {
  const complete: SearchResultItem[] = [];
  const modular: SearchResultItem[] = [];
  const partial: SearchResultItem[] = [];

  for (const { repo, analysis } of candidates) {
    let score = 35;
    const matched: string[] = [];
    const unmatched: string[] = [];

    // 语言匹配
    if (query.target_languages.length > 0) {
      if (repo.language && repo.language.toLowerCase() === query.target_languages[0].toLowerCase()) {
        score += 20;
        matched.push(`编程语言契合: ${repo.language}`);
      } else {
        score -= 10;
        unmatched.push(`语言不一致 (当前: ${repo.language || '未知'}, 需求: ${query.target_languages[0]})`);
      }
    }

    // 能力匹配
    const textCorpus = `${repo.full_name} ${repo.description} ${repo.topics.join(' ')} ${analysis.chinese_purpose}`.toLowerCase();
    let hitCapCount = 0;
    for (const cap of query.required_capabilities) {
      if (textCorpus.includes(cap.toLowerCase()) || analysis.satisfied_conditions.some(s => s.toLowerCase().includes(cap.toLowerCase()))) {
        hitCapCount++;
        matched.push(`命中核心能力: ${cap}`);
      } else {
        unmatched.push(`未确认支持: ${cap}`);
      }
    }
    if (query.required_capabilities.length > 0) {
      score += (hitCapCount / query.required_capabilities.length) * 30;
    }

    // Windows 环境契合
    if (query.environments.includes('Windows')) {
      if (analysis.os_compatibility.Windows === '支持') {
        score += 15;
        matched.push('确凿证据支持 Windows 运行');
      } else if (analysis.os_compatibility.Windows === '不支持') {
        score -= 25;
        unmatched.push('明确不支持 Windows');
      } else {
        unmatched.push('Windows 兼容性未见提及 (存疑未知)');
      }
    }

    // Star 缩放
    if (repo.stars > 0) {
      score += Math.min(10, Math.log10(repo.stars + 1) * 2);
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    let groupName: '较完整方案' | '可组合模块' | '部分满足需求';
    if (finalScore >= 75) {
      groupName = '较完整方案';
    } else if (finalScore >= 55) {
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
