import { CollectionItem, Repository, EvidenceAnalysis, Subscription, ChangeEvent, WorkflowPipeline } from '../types';

const STORAGE_KEY_COLLECTIONS = 'repo_radar_collections_v1';
const STORAGE_KEY_SUBSCRIPTIONS = 'repo_radar_subscriptions_v1';
const STORAGE_KEY_EVENTS = 'repo_radar_change_events_v1';
const STORAGE_KEY_PIPELINES = 'repo_radar_pipelines_v1';

export class StorageService {
  // ================= 收藏管理 =================
  public static getItems(): CollectionItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COLLECTIONS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static saveItem(
    repo: Repository,
    analysis: EvidenceAnalysis,
    status: '待评估' | '已试用' | '已采用' | '不适合',
    notes = ''
  ): void {
    const items = this.getItems();
    const existingIndex = items.findIndex(it => it.repo_github_id === repo.github_id);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (existingIndex >= 0) {
      items[existingIndex].evaluation_status = status;
      if (notes) items[existingIndex].user_notes = notes;
      items[existingIndex].updated_at = now;
      if (analysis) items[existingIndex].analysis = analysis;
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

    localStorage.setItem(STORAGE_KEY_COLLECTIONS, JSON.stringify(items));
  }

  public static removeItem(github_id: number): void {
    const items = this.getItems().filter(it => it.repo_github_id !== github_id);
    localStorage.setItem(STORAGE_KEY_COLLECTIONS, JSON.stringify(items));
  }

  // ================= 订阅管理 (方向三) =================
  public static getSubscriptions(): Subscription[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SUBSCRIPTIONS);
      if (!raw) {
        // 初始四大领域默认订阅
        const defaults: Subscription[] = [
          {
            id: 'sub_macro',
            name: '前沿宏观与面板计量',
            domain: '金融与经济研究',
            query_str: 'panel data econometrics python',
            frequency: '每周一',
            is_active: true,
          },
          {
            id: 'sub_acad',
            name: '学术论文解析与LaTeX工具',
            domain: '学术研究',
            query_str: 'pdf extraction latex python',
            frequency: '每周一',
            is_active: true,
          },
          {
            id: 'sub_quant',
            name: '量化策略回测与因子',
            domain: '量化交易',
            query_str: 'quantitative trading backtesting python',
            frequency: '每周一',
            is_active: true,
          },
          {
            id: 'sub_media',
            name: 'AI动画与视频字幕创作',
            domain: '视频与图片创作',
            query_str: 'manim whisper video python',
            frequency: '每周一',
            is_active: true,
          },
        ];
        localStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(defaults));
        return defaults;
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static saveSubscription(sub: Subscription): void {
    const subs = this.getSubscriptions();
    const idx = subs.findIndex(s => s.id === sub.id);
    if (idx >= 0) {
      subs[idx] = sub;
    } else {
      subs.unshift(sub);
    }
    localStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(subs));
  }

  public static deleteSubscription(id: string): void {
    const subs = this.getSubscriptions().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(subs));
  }

  public static updateSubscriptionWatermark(id: string, watermark: string): void {
    const subs = this.getSubscriptions();
    const target = subs.find(s => s.id === id);
    if (target) {
      target.last_pushed_watermark = watermark;
      target.last_checked_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
      localStorage.setItem(STORAGE_KEY_SUBSCRIPTIONS, JSON.stringify(subs));
    }
  }

  // ================= 变动事件管理 (方向三) =================
  public static getChangeEvents(): ChangeEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
      if (!raw) {
        const defaults: ChangeEvent[] = [
          {
            id: 'evt_init_1',
            repo_full_name: 'cindyjiang456-data/Covid-Economic-Panel-Analysis',
            change_type: '新发现',
            detail: '在订阅 [前沿宏观与面板计量] 中新发现项目: Panel data analysis of U.S. economic performance with fixed/random effects',
            occurred_at: '2026-11-02 05:36:49',
            is_read: false,
          },
          {
            id: 'evt_init_2',
            repo_full_name: 'BertilBraun/Pdf-Extraction',
            change_type: '新发现',
            detail: '在订阅 [学术论文解析与LaTeX工具] 中新发现项目: Extracts mathematical content from PDF and formats as rich Markdown/LaTeX',
            occurred_at: '2026-11-02 05:36:46',
            is_read: false,
          },
          {
            id: 'evt_init_3',
            repo_full_name: 'VarunSingh022/AlphaLab',
            change_type: '新发现',
            detail: '在订阅 [量化策略回测与因子] 中新发现项目: Institutional-grade event-driven quantitative trading framework',
            occurred_at: '2026-11-02 05:36:41',
            is_read: false,
          },
        ];
        localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(defaults));
        return defaults;
      }
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static addChangeEvent(event: ChangeEvent): void {
    const events = this.getChangeEvents();
    events.unshift(event);
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events.slice(0, 80)));
  }

  public static markAllEventsRead(): void {
    const events = this.getChangeEvents().map(e => ({ ...e, is_read: true }));
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
  }

  // ================= 组合工作流台 (方向二) =================
  public static getPipelines(): WorkflowPipeline[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PIPELINES);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public static savePipeline(pipeline: WorkflowPipeline): void {
    const pipelines = this.getPipelines();
    const idx = pipelines.findIndex(p => p.id === pipeline.id);
    if (idx >= 0) {
      pipelines[idx] = pipeline;
    } else {
      pipelines.unshift(pipeline);
    }
    localStorage.setItem(STORAGE_KEY_PIPELINES, JSON.stringify(pipelines));
  }

  // ================= 导出 =================
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
      ].join(',')),
    ];
    return rows.join('\n');
  }
}
