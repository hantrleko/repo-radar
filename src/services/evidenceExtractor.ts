import type {
  Repository,
  EvidenceAnalysis,
  RepoTreeInsight,
  IssuePainPoint,
  DomainProbeResult,
  UserEnvProfile,
  EnvCollisionAlert,
  GroundedQuote,
} from '../types/index.ts';

export class EvidenceExtractor {
  /**
   * 计算字符串的 SHA-256 哈希值（用于内容变更感知）
   */
  public static async computeHash(text: string): Promise<string> {
    if (!text) return '';
    try {
      const msgUint8 = new TextEncoder().encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      let h = 0;
      for (let i = 0; i < text.length; i++) {
        h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
      }
      return 'fallback-' + Math.abs(h).toString(16);
    }
  }

  /**
   * V0.3 维度一：分析仓库目录树骨架与可复现性材料
   */
  public static analyzeRepoTree(filePaths: string[]): RepoTreeInsight {
    const lowerPaths = filePaths.map(p => p.toLowerCase());
    const has_examples = lowerPaths.some(p => p.startsWith('examples/') || p.startsWith('example/') || p.startsWith('demos/') || p.includes('/examples/'));
    const has_notebooks = lowerPaths.some(p => p.endsWith('.ipynb'));
    const has_tests = lowerPaths.some(p => p.startsWith('tests/') || p.startsWith('test/') || p.includes('/tests/') || p.includes('test_'));
    const has_dockerfile = lowerPaths.some(p => p.endsWith('dockerfile') || p.includes('docker-compose'));
    const has_ci_workflows = lowerPaths.some(p => p.startsWith('.github/workflows/'));
    const has_replication_scripts = lowerPaths.some(
      p => p.endsWith('.do') || p.endsWith('.r') || p.includes('replicate') || p.includes('reproduce') || p.startsWith('data/')
    );

    const detected_artifacts: string[] = [];
    if (has_examples) detected_artifacts.push('示例目录(examples/)');
    if (has_notebooks) detected_artifacts.push('Jupyter交互笔记(.ipynb)');
    if (has_tests) detected_artifacts.push('自动化测试套件(tests/)');
    if (has_dockerfile) detected_artifacts.push('Docker容器配置');
    if (has_ci_workflows) detected_artifacts.push('GitHub CI流水线');
    if (has_replication_scripts) detected_artifacts.push('论文/数据复现脚本');

    return {
      has_examples,
      has_notebooks,
      has_tests,
      has_dockerfile,
      has_ci_workflows,
      has_replication_scripts,
      detected_artifacts,
      total_files_scanned: filePaths.length,
    };
  }

  /**
   * V0.3 维度一：扫描 Open Issues 提取社区真实踩坑预警
   */
  public static analyzeIssues(
    issues: { number: number; title: string; html_url: string; body?: string }[]
  ): IssuePainPoint[] {
    const painPoints: IssuePainPoint[] = [];

    for (const iss of issues) {
      const text = `${iss.title} ${(iss.body || '').slice(0, 300)}`.toLowerCase();
      let category: IssuePainPoint['category'] | null = null;

      if (/\b(windows|win10|win11|msvc|dll|powershell|win32)\b/i.test(text) && /\b(error|fail|bug|issue|cannot|broken|crash|not work)\b/i.test(text)) {
        category = 'Windows兼容';
      } else if (/\b(pip install|wheel|compile|build failed|cmake|setup\.py|dependency|importerror|modulenotfound)\b/i.test(text)) {
        category = '安装编译';
      } else if (/\b(cuda|oom|out of memory|vram|gpu|mps|torch\.cuda)\b/i.test(text) && /\b(error|fail|crash|memory)\b/i.test(text)) {
        category = '显存/算力';
      } else if (/\b(403|404|timeout|rate limit|api|expired|blocked|connection|失效|封禁)\b/i.test(text)) {
        category = '接口失效';
      } else if (/\b(abandoned|deprecated|still maintained|dead|unmaintained)\b/i.test(text)) {
        category = '维护警告';
      }

      if (category) {
        painPoints.push({
          number: iss.number,
          title: iss.title.slice(0, 95),
          html_url: iss.html_url,
          category,
        });
      }
      if (painPoints.length >= 4) break;
    }

    return painPoints;
  }

  /**
   * V0.3 维度二：四大垂直领域深水区专属探针
   */
  public static probeDomainVertical(
    repo: Repository,
    readmeText: string,
    dependencyText = '',
    filePaths: string[] = []
  ): DomainProbeResult {
    const combined = `${repo.name} ${repo.description || ''} ${repo.topics.join(' ')} ${readmeText} ${dependencyText}`.toLowerCase();

    // 1. 判断所属垂直领域
    let domain: DomainProbeResult['domain'] = '通用';
    if (/(\b(backtest|trading|quant|alpha|ctp|ccxt|vnpy|qlib|orderbook|sharpe|slippage)\b|回测|量化|行情|期货)/i.test(combined)) {
      domain = '量化交易';
    } else if (/(\b(econometric|panel data|causal|did|difference-in-differences|iv2sls|gmm|macroeconomic|akshare|statsmodels|linearmodels|pyfixest)\b|面板|计量|因果推断|宏观)/i.test(combined)) {
      domain = '金融与经济研究';
    } else if (/(\b(manim|whisper|subtitle|stable diffusion|comfyui|video|ffmpeg|moviepy|animation|vram)\b|字幕|视频|动画|生图)/i.test(combined)) {
      domain = '视频与图片创作';
    } else if (/(\b(arxiv|latex|bibtex|pdf|paper|citation|typst|thesis)\b|论文|学术|文献)/i.test(combined) || filePaths.some(p => p.endsWith('.bib') || p.endsWith('.tex'))) {
      domain = '学术研究';
    }

    const result: DomainProbeResult = { domain };

    // A. 金融与经济研究探针
    if (domain === '金融与经济研究') {
      const paidSources: string[] = [];
      if (/(\b(wind|wrds|bloomberg|csmar|tushare\s*pro)\b|万得|国泰安)/i.test(combined)) {
        paidSources.push('需商业终端或付费积分 (Wind/WRDS/Tushare Pro)');
      }
      const freeSources: string[] = [];
      if (/(\b(fred|world\s*bank|yahoo\s*finance|yfinance|eastmoney|baostock|akshare)\b|东方财富|新浪)/i.test(combined)) {
        freeSources.push('支持免费公网公开数据源');
      }
      result.data_source_type =
        paidSources.length > 0 && freeSources.length > 0
          ? '混合数据源 (含公网免费接口与可选付费终端)'
          : paidSources.length > 0
            ? paidSources[0]
            : freeSources.length > 0
              ? freeSources[0]
              : '自带数据集或纯算法模块 (无需外部数据订阅)';

      const ecoFeatures: string[] = [];
      if (/(\b(fixed\s+effects|twfe|absorbing|feols)\b|双向固定效应|固定效应)/i.test(combined)) ecoFeatures.push('双向固定效应(TWFE)');
      if (/(\b(difference-in-differences|did|staggered|event\s+study)\b|双重差分)/i.test(combined)) ecoFeatures.push('双重差分(DID)');
      if (/(\b(instrumental\s+variable|2sls|iv|gmm)\b|工具变量|广义矩)/i.test(combined)) ecoFeatures.push('工具变量/GMM');
      if (/(\b(cluster|robust\s+standard|hac|newey-west)\b|聚类稳健)/i.test(combined)) ecoFeatures.push('聚类稳健标准误');
      if (/(\b(latex|stargazer|summary_col|as_latex)\b|\.tex)/i.test(combined)) ecoFeatures.push('LaTeX发表级表格导出');
      result.econometric_features = ecoFeatures;
    }

    // B. 量化交易探针
    if (domain === '量化交易') {
      const has_commission_slippage = /(\b(commission|slippage|transaction\s+cost|fee|spread)\b|手续费|滑点|冲击成本)/i.test(combined);
      const lookahead_guard = /(\b(look-ahead|lookahead|survivorship|point-in-time|pit)\b|未来函数|幸存者偏差)/i.test(combined);
      let engine_type: '事件驱动(Event-Driven)' | '向量化(Vectorized)' | '未知' = '未知';
      if (/(\b(event-driven|event\s+driven|on_bar|on_tick)\b|事件驱动)/i.test(combined)) {
        engine_type = '事件驱动(Event-Driven)';
      } else if (/(\b(vectorized|vectorbt|pandas-based|array)\b|向量化)/i.test(combined)) {
        engine_type = '向量化(Vectorized)';
      }
      result.quant_authenticity = {
        has_commission_slippage,
        lookahead_guard,
        engine_type,
      };
    }

    // C. 学术研究探针 (arXiv / DOI / BibTeX)
    const arxivMatch = readmeText.match(/(?:arxiv\.org\/abs\/|arxiv\s*:\s*)(\d{4}\.\d{4,5}(?:v\d+)?)/i);
    const doiMatch = readmeText.match(/\b(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)\b/i);
    const bibMatch = readmeText.match(/@(article|inproceedings|misc|software|book)\s*\{[\s\S]{10,600}?\n\}/i);

    if (domain === '学术研究' || arxivMatch || doiMatch || bibMatch) {
      const year = (repo.pushed_at || '2026').slice(0, 4);
      const defaultBib = `@software{${repo.owner}_${repo.name}_${year},\n  author = {${repo.owner}},\n  title = {${repo.name}: ${(repo.description || 'Open Source Research Tool').replace(/[{}]/g, '')}},\n  year = {${year}},\n  url = {${repo.html_url}}\n}`;
      result.academic_metadata = {
        arxiv_id: arxivMatch ? arxivMatch[1] : undefined,
        doi: doiMatch ? doiMatch[1] : undefined,
        has_bibtex: Boolean(bibMatch),
        bibtex_snippet: bibMatch ? bibMatch[0].trim() : defaultBib,
      };
    }

    // D. 视频与图片创作探针 (代码 vs 权重双许可证 & 最低显存水位)
    if (domain === '视频与图片创作') {
      const code_license = repo.license_spdx || '未声明';
      let weight_commercial_safe: '可商用' | '非商用/受限' | '未知' = '未知';
      if (/\b(non-commercial|cc-by-nc|nc-sa|research\s+only|not\s+for\s+commercial|禁止商用|非商用)\b/i.test(readmeText)) {
        weight_commercial_safe = '非商用/受限';
      } else if (/\b(MIT|Apache-2\.0|BSD)\b/i.test(code_license) && !/\b(gpl|agpl|cc-by-nc)\b/i.test(readmeText)) {
        weight_commercial_safe = '可商用';
      }

      let min_vram_gb: number | undefined;
      const vramMatch =
        readmeText.match(/(\d{1,2})\s*GB\s*(?:VRAM|GPU\s*memory|显存)/i) ||
        readmeText.match(/(?:VRAM|显存)[^.\n\d]{0,15}(\d{1,2})\s*GB/i);
      if (vramMatch) {
        const parsedVram = parseInt(vramMatch[1], 10);
        if (parsedVram >= 2 && parsedVram <= 80) {
          min_vram_gb = parsedVram;
        }
      }

      result.media_license_split = {
        code_license,
        weight_commercial_safe,
        min_vram_gb,
      };
    }

    return result;
  }

  /**
   * V0.3 维度一：与用户本地环境画像碰撞检测
   */
  public static checkEnvCollision(
    analysis: EvidenceAnalysis,
    profile: UserEnvProfile,
    readmeText = '',
    dependencyText = ''
  ): EnvCollisionAlert[] {
    const alerts: EnvCollisionAlert[] = [];
    const combinedLower = `${readmeText} ${dependencyText}`.toLowerCase();

    // 1. OS 冲突检测
    if (profile.os === 'Windows') {
      if (analysis.os_compatibility.Windows === '不支持') {
        alerts.push({
          level: 'danger',
          reason: 'OS 冲突：该仓库明确声明不支持 Windows 系统',
        });
      }
      const linuxOnlyPkgs = ['uvloop', 'vllm', 'fcntl', 'termios', 'resource'];
      const hitLinuxPkgs = linuxOnlyPkgs.filter(pkg => new RegExp(`\\b${pkg}\\b`, 'i').test(combinedLower));
      if (hitLinuxPkgs.length > 0) {
        alerts.push({
          level: 'warning',
          reason: `Windows 编译预警：检测到仅限 Linux/POSIX 的依赖 (${hitLinuxPkgs.join(', ')})，建议在 WSL2 下运行`,
        });
      }
    }

    // 2. GPU 与显存碰撞检测
    if (!profile.has_nvidia_gpu && analysis.gpu_requirement === '必须') {
      alerts.push({
        level: 'danger',
        reason: '算力冲突：你的环境未配置 NVIDIA 独显，但该项目强制依赖 CUDA GPU',
      });
    }

    const reqVram = analysis.domain_probe?.media_license_split?.min_vram_gb;
    if (profile.has_nvidia_gpu && reqVram && reqVram > profile.vram_gb) {
      alerts.push({
        level: 'danger',
        reason: `显存不足预警：项目要求 >= ${reqVram}GB VRAM，超出你的本地显存 (${profile.vram_gb}GB)`,
      });
    }

    // 3. 商业付费 API 过滤碰撞
    if (
      profile.disallow_paid_api &&
      analysis.unsatisfied_conditions.some(c => c.includes('付费') || c.includes('密钥'))
    ) {
      alerts.push({
        level: 'warning',
        reason: '付费依赖预警：你开启了“排斥商业付费API”，该项目检测到第三方付费 Token 依赖',
      });
    }

    // 4. Issue 踩坑联动预警
    if (profile.os === 'Windows' && analysis.issue_pain_points?.some(p => p.category === 'Windows兼容')) {
      alerts.push({
        level: 'warning',
        reason: '社区 Issue 预警：该项目存在未关闭的 Windows 兼容性报错 Issue',
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        level: 'pass',
        reason: `环境画像匹配通过：适配你的 ${profile.os} + Python ${profile.python_version} (${profile.has_nvidia_gpu ? `${profile.vram_gb}GB GPU` : '纯CPU'})`,
      });
    }

    return alerts;
  }

  /**
   * V0.3 维度三：严格校验大模型返回的原文引证，杜绝幻觉
   */
  public static verifyGroundedQuotes(
    claims: { claim: string; exact_quote: string }[],
    readmeText: string
  ): GroundedQuote[] {
    const normalizedReadme = (readmeText || '').replace(/\s+/g, ' ').toLowerCase();
    return claims.map(item => {
      const cleanQuote = (item.exact_quote || '').replace(/\s+/g, ' ').trim().toLowerCase();
      // 要求引文至少 6 个字符且真实存在于 README 原文中
      const verified = cleanQuote.length >= 6 && normalizedReadme.includes(cleanQuote);
      return {
        claim: item.claim,
        exact_quote: item.exact_quote,
        verified,
      };
    });
  }

  /**
   * 从原始 README 文本、依赖清单、目录树与 Issue 中提炼完整客观证据
   */
  public static extractFromReadme(
    repo: Repository,
    readmeText: string,
    dependencyText = '',
    filePaths: string[] = [],
    issues: { number: number; title: string; html_url: string; body?: string }[] = [],
    userEnvProfile?: UserEnvProfile
  ): EvidenceAnalysis {
    const raw = readmeText || '';
    const lower = raw.toLowerCase();
    const depLower = dependencyText.toLowerCase();

    const snippets: string[] = [];

    // 1. 操作系统兼容性分析（铁律：未提及必标为未知）
    const os_compatibility = {
      Windows: '未知',
      Linux: '未知',
      macOS: '未知',
    };

    const winRegex = /\b(windows|win10|win11|powershell|win32|\.exe|windows-latest)\b/i;
    const winMatch = raw.match(winRegex);
    if (winMatch) {
      if (/not\s+supported\s+on\s+windows|windows\s+is\s+not\s+supported/i.test(raw)) {
        os_compatibility.Windows = '不支持';
      } else {
        os_compatibility.Windows = '支持';
      }
      const matchIndex = winMatch.index ?? 0;
      const snippet = raw.substring(Math.max(0, matchIndex - 40), Math.min(raw.length, matchIndex + 80)).replace(/\n+/g, ' ');
      snippets.push(`[Windows证据] "...${snippet.trim()}..."`);
    }

    const linuxRegex = /\b(linux|ubuntu|debian|centos|arch\s+linux|redhat)\b/i;
    if (linuxRegex.test(lower)) {
      os_compatibility.Linux = '支持';
    }

    const macRegex = /\b(macos|darwin|apple\s+silicon|m1|m2|m3|homebrew)\b/i;
    if (macRegex.test(lower)) {
      os_compatibility.macOS = '支持';
    }

    // 2. GPU 与显存需求
    let gpu_requirement = '未知';
    if (/\b(no\s+gpu|without\s+gpu|no\s+need\s+for\s+gpu|cpu\s*only|pure\s*python|无需显卡|无需\s*gpu)\b/i.test(lower)) {
      gpu_requirement = '无需';
    } else {
      const gpuRegex = /\b(gpu|cuda|nvidia|vram|tensorrt|rocm|显存)\b/i;
      const gpuMatch = raw.match(gpuRegex);
      if (gpuMatch) {
        if (/optional|cpu\s*fallback|can\s*run\s*on\s*cpu|可选/i.test(lower)) {
          gpu_requirement = '可选';
        } else {
          gpu_requirement = '必须';
        }
        const matchIndex = gpuMatch.index ?? 0;
        const snippet = raw.substring(Math.max(0, matchIndex - 30), Math.min(raw.length, matchIndex + 70)).replace(/\n+/g, ' ');
        snippets.push(`[GPU证据] "...${snippet.trim()}..."`);
      }
    }

    // 3. 提取核心依赖项
    const extractedDeps = new Set<string>();
    const commonDeps = [
      'pandas', 'numpy', 'scipy', 'statsmodels', 'linearmodels', 'pyfixest', 'torch', 'pytorch', 'tensorflow',
      'jax', 'sklearn', 'scikit-learn', 'matplotlib', 'seaborn', 'fastapi',
      'flask', 'requests', 'aiohttp', 'ccxt', 'whisper', 'ffmpeg', 'polars', 'pymupdf', 'manim'
    ];
    for (const d of commonDeps) {
      if (lower.includes(d) || depLower.includes(d)) {
        extractedDeps.add(d);
      }
    }

    // 4. 商业 API 与外部付费依赖识别
    const commercialKeys: string[] = [];
    if (/openai[_\s]*api[_\s]*key|gpt-4/i.test(raw)) commercialKeys.push('OpenAI API (付费)');
    if (/anthropic|claude[_\s]*api/i.test(raw)) commercialKeys.push('Anthropic API (付费)');
    if (/tushare\s*token/i.test(raw)) commercialKeys.push('Tushare Pro 积分Token');
    if (/alpaca[_\s]*api/i.test(raw)) commercialKeys.push('Alpaca 账户密钥');
    if (/ctp[_\s]*(account|password|broker)/i.test(raw)) commercialKeys.push('国内期货 CTP 柜台账户');

    // 5. 维护状态评估
    let maintenance_status = '活跃';
    if (repo.is_archived) {
      maintenance_status = '已归档';
    } else if (repo.pushed_at) {
      const pushYear = parseInt(repo.pushed_at.slice(0, 4), 10);
      if (pushYear < 2024) {
        maintenance_status = '维护放缓';
      }
    }

    // 6. 提炼中文一句话用途与适用场景
    let chinese_purpose = repo.description || `${repo.name} 开源项目`;
    if (chinese_purpose.length < 20 && raw) {
      const paragraphs = raw.split(/\n\n+/).map(p => p.trim()).filter(p => p && !p.startsWith('#') && !p.startsWith('[!'));
      if (paragraphs.length > 0) {
        chinese_purpose = paragraphs[0].replace(/[#*`]/g, '').slice(0, 160);
      }
    }

    const scenarios = [
      `适用于 ${repo.language || '通用'} 领域技术研发与实验`,
    ];
    if (extractedDeps.has('pandas') || extractedDeps.has('scipy') || extractedDeps.has('statsmodels')) {
      scenarios.push('时间序列与数理统计建模');
    }
    if (gpu_requirement === '必须' || gpu_requirement === '可选') {
      scenarios.push('深度学习与加速计算');
    }

    const satisfied: string[] = [];
    const unsatisfied: string[] = [];
    const unknown_conditions: string[] = [];

    if (os_compatibility.Windows === '支持') satisfied.push('README 明确包含 Windows 安装或运行说明');
    else if (os_compatibility.Windows === '不支持') unsatisfied.push('明确不支持 Windows 环境');
    else unknown_conditions.push('Windows 兼容性未在 README 中提及 (存疑)');

    if (gpu_requirement === '无需') satisfied.push('纯 CPU 运行，无需昂贵独立显卡');
    else if (gpu_requirement === '必须') unsatisfied.push('必须具备 NVIDIA/CUDA 显卡或同等算力');

    if (commercialKeys.length === 0) {
      satisfied.push('无强绑定商业付费 API 声明');
    } else {
      unsatisfied.push(`需要配置第三方密钥: ${commercialKeys.join(', ')}`);
    }

    // V0.3 深水区探针计算
    const tree_insight = filePaths.length > 0 ? this.analyzeRepoTree(filePaths) : undefined;
    if (tree_insight && tree_insight.detected_artifacts.length > 0) {
      satisfied.push(`仓库骨架完备: 含 ${tree_insight.detected_artifacts.join('、')}`);
    }

    const issue_pain_points = issues.length > 0 ? this.analyzeIssues(issues) : undefined;
    if (issue_pain_points && issue_pain_points.length > 0) {
      unsatisfied.push(`检测到 ${issue_pain_points.length} 条社区踩坑 Issue (${issue_pain_points.map(p => p.category).join('/')})`);
    }

    const domain_probe = this.probeDomainVertical(repo, raw, dependencyText, filePaths);

    const analysis: EvidenceAnalysis = {
      repo_github_id: repo.github_id,
      chinese_purpose,
      scenarios,
      satisfied_conditions: satisfied,
      unsatisfied_conditions: unsatisfied,
      unknown_conditions,
      os_compatibility,
      gpu_requirement,
      external_dependencies: Array.from(extractedDeps),
      license_summary: repo.license_spdx || '未声明',
      maintenance_status,
      evidence_snippets: snippets.length > 0 ? snippets : [repo.description ? `描述: ${repo.description}` : '已通过实时 GitHub README 证据分析'],
      is_deep_inspected: true,
      inspected_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      tree_insight,
      issue_pain_points,
      domain_probe,
    };

    if (userEnvProfile) {
      analysis.env_alerts = this.checkEnvCollision(analysis, userEnvProfile, raw, dependencyText);
    }

    return analysis;
  }
}
