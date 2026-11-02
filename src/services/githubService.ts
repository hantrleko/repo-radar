import { Repository, EvidenceAnalysis } from '../types';

export class GitHubService {
  private static getToken(): string {
    return localStorage.getItem('repo_radar_gh_token') || '';
  }

  public static async searchRemote(query: string, limit = 6): Promise<{ repo: Repository; analysis: EvidenceAnalysis }[]> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${limit}`, {
        headers,
      });

      if (!res.ok) {
        throw new Error(`GitHub API HTTP ${res.status}`);
      }

      const data = await res.json();
      const items = data.items || [];

      return items.map((item: any) => {
        const repo: Repository = {
          github_id: item.id,
          full_name: item.full_name,
          owner: item.owner?.login || '',
          name: item.name,
          description: item.description || '',
          html_url: item.html_url,
          stars: item.stargazers_count || 0,
          language: item.language || '未知',
          license_spdx: item.license?.spdx_id || '未声明',
          pushed_at: item.pushed_at || '',
          topics: item.topics || [],
        };

        const analysis: EvidenceAnalysis = {
          repo_github_id: repo.github_id,
          chinese_purpose: repo.description || `${repo.name} 开源项目`,
          scenarios: [`适用于 ${repo.language} 开发与研究场景`],
          satisfied_conditions: [`命中搜索能力`],
          unsatisfied_conditions: [],
          unknown_conditions: ['Windows兼容性未查到明文证据 (显示未知)'],
          os_compatibility: { Windows: '未知', Linux: '支持', macOS: '未知' },
          gpu_requirement: '未知',
          external_dependencies: [],
          license_summary: repo.license_spdx,
          maintenance_status: '活跃',
          evidence_snippets: [repo.description ? `描述: ${repo.description}` : '已通过 GitHub Search API 实时索引抓取'],
        };

        return { repo, analysis };
      });
    } catch (e) {
      console.warn('GitHub search error:', e);
      return [];
    }
  }

  public static async getRateLimit(): Promise<{ remaining: number; limit: number }> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) headers['Authorization'] = `token ${token}`;

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
