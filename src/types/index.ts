export interface Repository {
  github_id: number;
  full_name: string;
  owner: string;
  name: string;
  description: string;
  html_url: string;
  stars: number;
  forks?: number;
  language: string;
  license_spdx: string;
  pushed_at: string;
  topics: string[];
  is_archived?: boolean;
}

export interface EvidenceAnalysis {
  repo_github_id: number;
  chinese_purpose: string;
  scenarios: string[];
  satisfied_conditions: string[];
  unsatisfied_conditions: string[];
  unknown_conditions: string[];
  os_compatibility: {
    Windows: string;
    Linux: string;
    macOS: string;
  };
  gpu_requirement: string;
  external_dependencies: string[];
  license_summary: string;
  maintenance_status: string;
  evidence_snippets: string[];
}

export interface ParsedQuery {
  original_query: string;
  target: string;
  required_capabilities: string[];
  preferences: string[];
  environments: string[];
  exclusions: string[];
  target_languages: string[];
  generated_github_queries: string[];
}

export interface SearchResultItem {
  repository: Repository;
  analysis: EvidenceAnalysis;
  match_score: number;
  match_group: '较完整方案' | '可组合模块' | '部分满足需求';
  matched_reasons: string[];
  unmatched_reasons: string[];
}

export interface CollectionItem {
  collection_id: string;
  repo_github_id: number;
  repo: Repository;
  analysis?: EvidenceAnalysis;
  evaluation_status: '待评估' | '已试用' | '已采用' | '不适合';
  user_notes: string;
  custom_tags: string[];
  updated_at: string;
}

export interface ChangeEvent {
  id: string;
  repo_full_name: string;
  change_type: '新发现' | 'README功能变化' | '新版本' | '归档或转移' | '许可证变化';
  detail: string;
  occurred_at: string;
  is_read: boolean;
}
