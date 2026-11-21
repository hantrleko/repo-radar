import type { Repository, EvidenceAnalysis, ChangeEvent, AwesomeImportedCandidate } from '../types/index.ts';
import { EvidenceExtractor } from './evidenceExtractor.ts';
import { StorageService } from './storageService.ts';
import { LLMService } from './llmService.ts';
import { GistSyncService } from './gistSyncService.ts';

export class GitHubService {
  private static getToken(): string {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('repo_radar_gh_token') || '';
    }
    return '';
  }

  private static getHeaders(etag?: string): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    if (etag) {
      headers['If-None-Match'] = etag;
    }
    return headers;
  }

  /**
   * 搜索 GitHub 仓库
   */
  public static async searchRemote(
    query: string,
    perPage = 6
  ): Promise<{ repo: Repository; analysis: EvidenceAnalysis }[]> {
    const headers = this.getHeaders();
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`;

    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      const items: any[] = data.items || [];
      const userProfile = StorageService.getUserEnvProfile();

      return items.map(item => {
        const repo: Repository = {
          github_id: item.id,
          full_name: item.full_name,
          owner: item.owner?.login || '',
          name: item.name,
          description: item.description || '暂无描述',
          html_url: item.html_url,
          stars: item.stargazers_count || 0,
          forks: item.forks_count || 0,
          open_issues: item.open_issues_count || 0,
          language: item.language || 'Unknown',
          license_spdx: item.license?.spdx_id || '未知',
          pushed_at: item.pushed_at || '',
          default_branch: item.default_branch || 'main',
          topics: item.topics || [],
          is_archived: Boolean(item.archived),
        };

        const domainProbe = EvidenceExtractor.probeDomainVertical(repo, repo.description, '');

        const analysis: EvidenceAnalysis = {
          repo_github_id: repo.github_id,
          chinese_purpose: repo.description || `${repo.name} 开源项目`,
          scenarios: [`适用于 ${repo.language} 技术研发与实验`],
          satisfied_conditions: [`命中检索需求`],
          unsatisfied_conditions: [],
          unknown_conditions: ['Windows兼容性未查到明文证据 (显示未知)'],
          os_compatibility: { Windows: '未知', Linux: '未知', macOS: '未知' },
          gpu_requirement: '未知',
          external_dependencies: [],
          license_summary: repo.license_spdx,
          maintenance_status: repo.is_archived ? '已归档' : '活跃',
          evidence_snippets: [repo.description ? `描述: ${repo.description}` : '已通过实时 GitHub 搜索索引抓取'],
          is_deep_inspected: false,
          domain_probe: domainProbe,
        };

        analysis.env_alerts = EvidenceExtractor.checkEnvCollision(analysis, userProfile, repo.description, '');

        return { repo, analysis };
      });
    } catch (e) {
      console.warn('GitHub search error:', e);
      return [];
    }
  }

  /**
   * 获取单个仓库的 README 文本内容，带本地 ETag 缓存支持
   */
  public static async fetchRepoReadme(owner: string, repo: string): Promise<{ text: string; sha?: string; etag?: string }> {
    const etagKey = `etag_${owner}_${repo}`;
    const cacheKey = `readme_cache_${owner}_${repo}`;
    const hasStorage = typeof localStorage !== 'undefined';
    const cachedEtag = hasStorage ? (localStorage.getItem(etagKey) || '') : '';

    const headers = this.getHeaders(cachedEtag);
    headers['Accept'] = 'application/vnd.github.raw+json';

    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
      if (res.status === 304 && hasStorage) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          return { text: parsed.text, sha: parsed.sha, etag: cachedEtag };
        }
      }

      if (!res.ok) {
        return { text: '' };
      }

      const text = await res.text();
      const newEtag = res.headers.get('ETag') || '';
      if (newEtag && hasStorage) localStorage.setItem(etagKey, newEtag);

      const hash = await EvidenceExtractor.computeHash(text);
      if (hasStorage) {
        localStorage.setItem(cacheKey, JSON.stringify({ text, sha: hash.slice(0, 10) }));
      }

      return { text, sha: hash.slice(0, 10), etag: newEtag };
    } catch {
      return { text: '' };
    }
  }

  /**
   * 尝试拉取依赖文件（requirements.txt / pyproject.toml / package.json）
   */
  public static async fetchDependencyFile(owner: string, repo: string): Promise<string> {
    const candidates = ['requirements.txt', 'pyproject.toml', 'package.json'];
    const headers = this.getHeaders();
    headers['Accept'] = 'application/vnd.github.raw+json';

    for (const filename of candidates) {
      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filename}`, { headers });
        if (res.ok) {
          return await res.text();
        }
      } catch {}
    }
    return '';
  }

  /**
   * V0.3 维度一：拉取仓库目录树结构 (1 次 API 请求嗅探全仓文件骨架)
   */
  public static async fetchRepoTree(owner: string, repo: string, branch = 'HEAD'): Promise<string[]> {
    const headers = this.getHeaders();
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data.tree)) return [];
      return data.tree.slice(0, 800).map((item: any) => item.path || '');
    } catch {
      return [];
    }
  }

  /**
   * V0.3 维度一：拉取仓库最近 Open Issues (用于识别社区真实踩坑)
   */
  public static async fetchOpenIssues(
    owner: string,
    repo: string
  ): Promise<{ number: number; title: string; html_url: string; body?: string }[]> {
    const headers = this.getHeaders();
    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=open&sort=updated&per_page=15`,
        { headers }
      );
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data
        .filter((iss: any) => !iss.pull_request)
        .map((iss: any) => ({
          number: iss.number,
          title: iss.title || '',
          html_url: iss.html_url || '',
          body: iss.body || '',
        }));
    } catch {
      return [];
    }
  }

  /**
   * V0.3 深度取证：并发拉取 README + 依赖文件 + 目录树骨架 + Open Issues + 可选 BYOK 大模型强制引证提取
   */
  public static async deepInspectRepo(repo: Repository): Promise<{ repo: Repository; analysis: EvidenceAnalysis }> {
    const branch = repo.default_branch || 'HEAD';
    const [{ text: readmeText, sha }, depText, filePaths, issues] = await Promise.all([
      this.fetchRepoReadme(repo.owner, repo.name),
      this.fetchDependencyFile(repo.owner, repo.name),
      this.fetchRepoTree(repo.owner, repo.name, branch),
      this.fetchOpenIssues(repo.owner, repo.name),
    ]);

    const userProfile = StorageService.getUserEnvProfile();

    if (!readmeText) {
      return {
        repo,
        analysis: {
          repo_github_id: repo.github_id,
          chinese_purpose: repo.description || `${repo.name} 开源项目`,
          scenarios: [`适用于 ${repo.language} 通用场景`],
          satisfied_conditions: ['基础元数据已索引'],
          unsatisfied_conditions: [],
          unknown_conditions: ['未找到公开 README 文档'],
          os_compatibility: { Windows: '未知', Linux: '未知', macOS: '未知' },
          gpu_requirement: '未知',
          external_dependencies: [],
          license_summary: repo.license_spdx,
          maintenance_status: repo.is_archived ? '已归档' : '活跃',
          evidence_snippets: ['未查找到 README 文本证据'],
          is_deep_inspected: false,
          tree_insight: filePaths.length > 0 ? EvidenceExtractor.analyzeRepoTree(filePaths) : undefined,
          issue_pain_points: issues.length > 0 ? EvidenceExtractor.analyzeIssues(issues) : undefined,
        },
      };
    }

    const hash = await EvidenceExtractor.computeHash(readmeText);
    const analysis = EvidenceExtractor.extractFromReadme(
      repo,
      readmeText,
      depText,
      filePaths,
      issues,
      userProfile
    );
    analysis.readme_hash = hash;
    analysis.commit_sha = sha;

    // 若用户开启了 BYOK 大模型双擎，附加执行带原文引证校验的深度提取
    const llmGrounded = await LLMService.extractGroundedEvidenceWithLLM(repo, readmeText);
    if (llmGrounded) {
      if (llmGrounded.chinese_purpose && llmGrounded.chinese_purpose.length >= 10) {
        analysis.chinese_purpose = llmGrounded.chinese_purpose;
      }
      analysis.llm_grounded_quotes = llmGrounded.grounded_quotes;
      for (const q of llmGrounded.grounded_quotes) {
        if (q.verified) {
          analysis.satisfied_conditions.push(`[LLM引证已核实] ${q.claim}`);
        } else {
          analysis.unknown_conditions.push(`[LLM引证未查到原文/已拦截] ${q.claim}`);
        }
      }
    }

    return { repo, analysis };
  }

  /**
   * 批量深挖前 N 个候选项目
   */
  public static async batchInspectCandidates(
    candidates: { repo: Repository; analysis: EvidenceAnalysis }[],
    limit = 4,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ repo: Repository; analysis: EvidenceAnalysis }[]> {
    const inspected = [...candidates];
    const targetCount = Math.min(candidates.length, limit);

    for (let i = 0; i < targetCount; i++) {
      if (!inspected[i].analysis.is_deep_inspected) {
        try {
          const res = await this.deepInspectRepo(inspected[i].repo);
          inspected[i] = res;
        } catch (e) {
          console.warn(`Deep inspect failed for ${inspected[i].repo.full_name}:`, e);
        }
      }
      if (onProgress) onProgress(i + 1, targetCount);
    }

    return inspected;
  }

  /**
   * V0.3 维度五：拉取指定 Awesome 仓库的 README 并批量解析其中的 GitHub 候选项目
   */
  public static async fetchAwesomeListCandidates(
    repoUrlOrFullName: string
  ): Promise<AwesomeImportedCandidate[]> {
    const clean = repoUrlOrFullName
      .trim()
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\/$/, '');
    const parts = clean.split('/');
    if (parts.length < 2) return [];

    const owner = parts[0];
    const repo = parts[1];
    const { text } = await this.fetchRepoReadme(owner, repo);
    if (!text) return [];
    return GistSyncService.parseAwesomeMarkdown(text);
  }

  /**
   * 对比仓库与旧快照，生成增量 ChangeEvent
   */
  public static async checkRepoForDiff(
    repo: Repository,
    oldPushedAt?: string,
    oldReadmeHash?: string
  ): Promise<ChangeEvent[]> {
    const events: ChangeEvent[] = [];
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (oldReadmeHash) {
      const { text: newReadme } = await this.fetchRepoReadme(repo.owner, repo.name);
      if (newReadme) {
        const newHash = await EvidenceExtractor.computeHash(newReadme);
        if (newHash !== oldReadmeHash) {
          events.push({
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            repo_full_name: repo.full_name,
            change_type: 'README功能变化',
            detail: '检测到项目 README 内容重大变更，已触发重新提取适用性证据',
            occurred_at: now,
            is_read: false,
          });
        }
      }
    }

    if (repo.is_archived) {
      events.push({
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        repo_full_name: repo.full_name,
        change_type: '归档或转移',
        detail: '项目已被官方归档 (只读锁定状态)',
        occurred_at: now,
        is_read: false,
      });
    }

    if (oldPushedAt && repo.pushed_at && repo.pushed_at > oldPushedAt) {
      events.push({
        id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        repo_full_name: repo.full_name,
        change_type: '新版本',
        detail: `检测到新提交代码推送 (Pushed at: ${repo.pushed_at.slice(0, 10)})`,
        occurred_at: now,
        is_read: false,
      });
    }

    return events;
  }

  /**
   * 获取当前 Token 的速率限制
   */
  public static async getRateLimit(): Promise<{ remaining: number; limit: number }> {
    const headers = this.getHeaders();
    try {
      const res = await fetch('https://api.github.com/rate_limit', { headers });
      if (res.ok) {
        const data = await res.json();
        return {
          remaining: data.resources?.search?.remaining ?? 10,
          limit: data.resources?.search?.limit ?? 10,
        };
      }
    } catch {}
    return { remaining: 10, limit: 10 };
  }
}
