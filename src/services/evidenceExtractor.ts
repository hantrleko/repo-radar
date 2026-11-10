import type { Repository, EvidenceAnalysis } from '../types/index.ts';

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
      // 简单降级 hash
      let h = 0;
      for (let i = 0; i < text.length; i++) {
        h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
      }
      return 'fallback-' + Math.abs(h).toString(16);
    }
  }

  /**
   * 从原始 README 文本及依赖清单中提炼客观证据
   */
  public static extractFromReadme(
    repo: Repository,
    readmeText: string,
    dependencyText = ''
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
      'pandas', 'numpy', 'scipy', 'statsmodels', 'torch', 'pytorch', 'tensorflow',
      'jax', 'sklearn', 'scikit-learn', 'matplotlib', 'seaborn', 'fastapi',
      'flask', 'requests', 'aiohttp', 'ccxt', 'whisper', 'ffmpeg', 'polars'
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
    // 若原描述太短，从 README 截取首个有意义的段落
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

    return {
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
    };
  }
}
