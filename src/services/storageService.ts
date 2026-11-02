import { CollectionItem, Repository, EvidenceAnalysis } from '../types';

const STORAGE_KEY = 'repo_radar_collections_v1';

export class StorageService {
  public static getItems(): CollectionItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static saveItem(repo: Repository, analysis: EvidenceAnalysis, status: '待评估' | '已试用' | '已采用' | '不适合', notes = '') {
    const items = this.getItems();
    const existingIndex = items.findIndex(it => it.repo_github_id === repo.github_id);

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (existingIndex >= 0) {
      items[existingIndex].evaluation_status = status;
      if (notes) items[existingIndex].user_notes = notes;
      items[existingIndex].updated_at = now;
    } else {
      items.push({
        collection_id: 'default',
        repo_github_id: repo.github_id,
        repo,
        analysis,
        evaluation_status: status,
        user_notes: notes,
        custom_tags: [],
        updated_at: now,
      });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  public static removeItem(github_id: number) {
    const items = this.getItems().filter(it => it.repo_github_id !== github_id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  public static exportJSON(): string {
    const items = this.getItems();
    return JSON.stringify(items, null, 2);
  }

  public static exportCSV(): string {
    const items = this.getItems();
    const rows = [
      ['GitHub ID', '仓库全称', '链接', 'Stars', '语言', '许可证', '评估状态', '试用笔记', '更新时间'].join(','),
      ...items.map(it => [
        it.repo_github_id,
        `"${it.repo.full_name}"`,
        it.repo.html_url,
        it.repo.stars,
        it.repo.language || '',
        `"${it.repo.license_spdx || ''}"`,
        it.evaluation_status,
        `"${it.user_notes.replace(/"/g, '""')}"`,
        it.updated_at,
      ].join(','))
    ];
    return rows.join('\n');
  }
}
