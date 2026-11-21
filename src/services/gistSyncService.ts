import type { AwesomeImportedCandidate } from '../types/index.ts';
import { StorageService } from './storageService.ts';

const GIST_FILENAME = 'repo-radar-sync-v3.json';

export class GistSyncService {
  /**
   * 将本地全量资产（收藏、评估笔记、订阅、工作流、环境画像）加密同步到用户的 GitHub Secret Gist
   */
  public static async pushToGist(
    token: string,
    existingGistId?: string
  ): Promise<{ ok: boolean; gistId?: string; htmlUrl?: string; message: string }> {
    if (!token.trim()) {
      return { ok: false, message: '请先配置具有 gist 权限的 GitHub Personal Access Token' };
    }

    const content = StorageService.exportFullSnapshot();
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token.trim()}`,
      'Content-Type': 'application/json',
    };

    const payload = {
      description: '个人开源项目雷达 (RepoRadar CN V0.3) 跨端加密云同步快照',
      public: false,
      files: {
        [GIST_FILENAME]: {
          content,
        },
      },
    };

    try {
      const targetId = existingGistId?.trim() || StorageService.getGistId();
      if (targetId) {
        const patchRes = await fetch(`https://api.github.com/gists/${targetId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        });
        if (patchRes.ok) {
          const data = await patchRes.json();
          StorageService.saveGistId(data.id);
          return {
            ok: true,
            gistId: data.id,
            htmlUrl: data.html_url,
            message: `已更新云端私密 Gist (${data.id.slice(0, 8)}...)`,
          };
        }
      }

      // 创建新的 Secret Gist
      const postRes = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!postRes.ok) {
        const err = await postRes.text();
        return { ok: false, message: `Gist 同步失败 (HTTP ${postRes.status}): ${err.slice(0, 90)}` };
      }

      const data = await postRes.json();
      StorageService.saveGistId(data.id);
      return {
        ok: true,
        gistId: data.id,
        htmlUrl: data.html_url,
        message: `已创建云端私密 Gist (${data.id.slice(0, 8)}...) 并完成备份！`,
      };
    } catch (e: any) {
      return { ok: false, message: `网络异常: ${e?.message || '未知错误'}` };
    }
  }

  /**
   * 从指定的 GitHub Secret Gist 恢复全量知识库
   */
  public static async pullFromGist(
    token: string,
    gistId: string
  ): Promise<{ ok: boolean; message: string }> {
    const cleanId = gistId.trim() || StorageService.getGistId();
    if (!cleanId) {
      return { ok: false, message: '请填入要恢复的 Gist ID' };
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (token.trim()) {
      headers['Authorization'] = `token ${token.trim()}`;
    }

    try {
      const res = await fetch(`https://api.github.com/gists/${cleanId}`, { headers });
      if (!res.ok) {
        return { ok: false, message: `无法读取 Gist (HTTP ${res.status})，请检查 Gist ID 或 Token` };
      }

      const data = await res.json();
      const fileObj =
        data.files?.[GIST_FILENAME] ||
        Object.values(data.files || {}).find((f: any) => f?.filename?.endsWith('.json'));

      if (!fileObj || !(fileObj as any).content) {
        return { ok: false, message: '该 Gist 中未找到 repo-radar-sync-v3.json 快照文件' };
      }

      const stats = StorageService.importFullSnapshot((fileObj as any).content);
      StorageService.saveGistId(cleanId);

      return {
        ok: true,
        message: `云端恢复成功：已导入 ${stats.collectionsCount} 个收藏、${stats.subscriptionsCount} 条订阅、${stats.catalogCount} 个扩展目录项！`,
      };
    } catch (e: any) {
      return { ok: false, message: `恢复解析失败: ${e?.message || '格式错误'}` };
    }
  }

  /**
   * 解析 Awesome 清单 Markdown，批量提取 GitHub 仓库并自动按四大领域归类
   */
  public static parseAwesomeMarkdown(markdownText: string): AwesomeImportedCandidate[] {
    if (!markdownText) return [];

    const results: AwesomeImportedCandidate[] = [];
    const seen = new Set<string>();
    const blockedOwners = new Set([
      'topics',
      'sponsors',
      'orgs',
      'settings',
      'marketplace',
      'features',
      'about',
      'pricing',
      'login',
      'join',
    ]);

    const lines = markdownText.split(/\r?\n/);
    const linkRegex = /https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:[)/#\s]|$)/;

    for (const line of lines) {
      const match = line.match(linkRegex);
      if (!match) continue;

      const owner = match[1];
      const name = match[2].replace(/\.git$/i, '').replace(/[.,;)]+$/, '');
      if (!owner || !name || blockedOwners.has(owner.toLowerCase())) continue;

      const full_name = `${owner}/${name}`;
      const lowerFull = full_name.toLowerCase();
      if (seen.has(lowerFull)) continue;
      seen.add(lowerFull);

      // 提取同行中的描述说明
      let desc = line
        .replace(/\[([^\]]+)\]\(https:\/\/github\.com\/[^)]+\)/g, '$1')
        .replace(/https:\/\/github\.com\/[^\s)]+/g, '')
        .replace(/^[\s*+-]+/, '')
        .replace(/^[^:：-]*[:：-]\s*/, '')
        .trim();

      if (desc.length < 6) {
        desc = `${full_name} (从 Awesome 清单导入的开源项目)`;
      }

      const combinedLower = `${full_name} ${desc}`.toLowerCase();
      let inferred_domain: AwesomeImportedCandidate['inferred_domain'] = '学术研究';
      let inferred_subcategory = '研究复现';

      if (/(\b(quant|trading|backtest|alpha|factor|ctp|broker|orderbook|exchange|crypto|ccxt|strategy|vnpy|qlib)\b|回测|量化|策略|因子|行情|期货)/i.test(combinedLower)) {
        inferred_domain = '量化交易';
        inferred_subcategory = /factor|alpha|因子/i.test(combinedLower) ? '因子研究' : '策略回测';
      } else if (/(\b(econometric|macro|panel|causal|did|finance|stock|gdp|fred|akshare|statsmodels|gmm|pyfixest|linearmodels)\b|计量|宏观|经济|因果|面板|金融)/i.test(combinedLower)) {
        inferred_domain = '金融与经济研究';
        inferred_subcategory = /causal|did|因果/i.test(combinedLower) ? '因果推断' : '面板计量';
      } else if (/(\b(video|image|audio|whisper|subtitle|manim|animation|diffusion|tts|ffmpeg|moviepy)\b|视频|字幕|动画|图像|配音)/i.test(combinedLower)) {
        inferred_domain = '视频与图片创作';
        inferred_subcategory = /subtitle|whisper|字幕/i.test(combinedLower) ? '字幕' : '代码动画';
      } else {
        inferred_domain = '学术研究';
        inferred_subcategory = /latex|typst|bibtex/i.test(combinedLower)
          ? 'LaTeX'
          : /pdf|paper/i.test(combinedLower)
            ? 'PDF 阅读'
            : '研究复现';
      }

      results.push({
        owner,
        name,
        full_name,
        html_url: `https://github.com/${full_name}`,
        description: desc.slice(0, 160),
        inferred_domain,
        inferred_subcategory,
      });

      if (results.length >= 60) break;
    }

    return results;
  }
}
