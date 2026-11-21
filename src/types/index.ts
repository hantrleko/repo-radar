export interface Repository {
  github_id: number;
  full_name: string;
  owner: string;
  name: string;
  description: string;
  html_url: string;
  stars: number;
  forks?: number;
  open_issues?: number;
  language: string;
  license_spdx: string;
  pushed_at: string;
  default_branch?: string;
  topics: string[];
  is_archived?: boolean;
}

export interface RepoTreeInsight {
  has_examples: boolean;
  has_notebooks: boolean;
  has_tests: boolean;
  has_dockerfile: boolean;
  has_ci_workflows: boolean;
  has_replication_scripts: boolean;
  detected_artifacts: string[];
  total_files_scanned: number;
}

export interface IssuePainPoint {
  number: number;
  title: string;
  html_url: string;
  category: 'Windows兼容' | '安装编译' | '接口失效' | '显存/算力' | '维护警告';
}

export interface DomainProbeResult {
  domain: '金融与经济研究' | '量化交易' | '学术研究' | '视频与图片创作' | '通用';
  data_source_type?: string;
  econometric_features?: string[];
  quant_authenticity?: {
    has_commission_slippage: boolean;
    lookahead_guard: boolean;
    engine_type: '事件驱动(Event-Driven)' | '向量化(Vectorized)' | '未知';
  };
  academic_metadata?: {
    arxiv_id?: string;
    doi?: string;
    has_bibtex: boolean;
    bibtex_snippet?: string;
  };
  media_license_split?: {
    code_license: string;
    weight_commercial_safe: '可商用' | '非商用/受限' | '未知';
    min_vram_gb?: number;
  };
}

export interface UserEnvProfile {
  os: 'Windows' | 'macOS' | 'Linux';
  python_version: string;
  has_nvidia_gpu: boolean;
  vram_gb: number;
  disallow_paid_api: boolean;
}

export interface EnvCollisionAlert {
  level: 'danger' | 'warning' | 'pass';
  reason: string;
}

export interface GroundedQuote {
  claim: string;
  exact_quote: string;
  verified: boolean;
}

export interface LLMConfig {
  enabled: boolean;
  provider: 'deepseek' | 'openai' | 'ollama';
  base_url: string;
  api_key: string;
  model: string;
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
  readme_hash?: string;
  commit_sha?: string;
  inspected_at?: string;
  is_deep_inspected?: boolean;
  // V0.3 新增深水区探针字段
  tree_insight?: RepoTreeInsight;
  issue_pain_points?: IssuePainPoint[];
  domain_probe?: DomainProbeResult;
  env_alerts?: EnvCollisionAlert[];
  llm_grounded_quotes?: GroundedQuote[];
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
  llm_enhanced?: boolean;
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

export interface Subscription {
  id: string;
  name: string;
  query_str: string;
  domain: string;
  frequency: string;
  last_pushed_watermark?: string;
  last_checked_at?: string;
  is_active: boolean;
}

export interface ChangeEvent {
  id: string;
  subscription_id?: string;
  repo_full_name: string;
  change_type: '新发现' | 'README功能变化' | '新版本' | '归档或转移' | '许可证变化';
  old_value?: string;
  new_value?: string;
  detail: string;
  occurred_at: string;
  is_read: boolean;
}

export interface WorkflowSlot {
  id: string;
  step_name: string;
  capability: string;
  repo?: Repository;
  analysis?: EvidenceAnalysis;
  interface_hypothesis: string;
}

export interface WorkflowPipeline {
  id: string;
  title: string;
  domain: string;
  description: string;
  slots: WorkflowSlot[];
  created_at: string;
}

export interface AwesomeImportedCandidate {
  owner: string;
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  inferred_domain: '学术研究' | '金融与经济研究' | '量化交易' | '视频与图片创作';
  inferred_subcategory: string;
}
