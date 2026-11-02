-- SQLite Schema for Personal Repo Radar

CREATE TABLE IF NOT EXISTS repositories (
    github_id INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL UNIQUE,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    html_url TEXT NOT NULL,
    default_branch TEXT DEFAULT 'main',
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    open_issues INTEGER DEFAULT 0,
    language TEXT,
    license_spdx TEXT,
    pushed_at TEXT,
    created_at TEXT,
    updated_at TEXT,
    is_archived INTEGER DEFAULT 0,
    is_fork INTEGER DEFAULT 0,
    topics TEXT DEFAULT '[]',
    homepage TEXT,
    last_scraped_at TEXT,
    scrape_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_repos_pushed_at ON repositories(pushed_at);
CREATE INDEX IF NOT EXISTS idx_repos_language ON repositories(language);
CREATE INDEX IF NOT EXISTS idx_repos_stars ON repositories(stars);

CREATE TABLE IF NOT EXISTS evidence_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_github_id INTEGER NOT NULL,
    commit_sha TEXT,
    content_hash TEXT NOT NULL,
    readme_text TEXT,
    requirements_text TEXT,
    license_text TEXT,
    captured_at TEXT,
    FOREIGN KEY(repo_github_id) REFERENCES repositories(github_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snapshots_repo_id ON evidence_snapshots(repo_github_id);

CREATE TABLE IF NOT EXISTS evidence_analyses (
    repo_github_id INTEGER PRIMARY KEY,
    chinese_purpose TEXT,
    scenarios TEXT DEFAULT '[]',
    satisfied_conditions TEXT DEFAULT '[]',
    unsatisfied_conditions TEXT DEFAULT '[]',
    unknown_conditions TEXT DEFAULT '[]',
    os_compatibility TEXT DEFAULT '{}',
    gpu_requirement TEXT DEFAULT '未知',
    external_dependencies TEXT DEFAULT '[]',
    license_summary TEXT DEFAULT '未知',
    maintenance_status TEXT DEFAULT '活跃',
    evidence_snippets TEXT DEFAULT '[]',
    model_used TEXT,
    analyzed_at TEXT,
    FOREIGN KEY(repo_github_id) REFERENCES repositories(github_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS repo_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_github_id INTEGER NOT NULL,
    domain TEXT NOT NULL,
    subcategory TEXT,
    capability TEXT,
    modality TEXT,
    is_manual INTEGER DEFAULT 0,
    FOREIGN KEY(repo_github_id) REFERENCES repositories(github_id) ON DELETE CASCADE,
    UNIQUE(repo_github_id, domain, subcategory, capability, modality)
);

CREATE INDEX IF NOT EXISTS idx_tags_domain ON repo_tags(domain, subcategory);

CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS collection_items (
    collection_id INTEGER NOT NULL,
    repo_github_id INTEGER NOT NULL,
    evaluation_status TEXT DEFAULT '待评估',
    user_notes TEXT DEFAULT '',
    custom_tags TEXT DEFAULT '[]',
    added_at TEXT,
    updated_at TEXT,
    PRIMARY KEY(collection_id, repo_github_id),
    FOREIGN KEY(collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    FOREIGN KEY(repo_github_id) REFERENCES repositories(github_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    query_str TEXT NOT NULL,
    domain TEXT,
    frequency_days INTEGER DEFAULT 7,
    last_checked_at TEXT,
    last_pushed_watermark TEXT,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS change_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription_id INTEGER,
    repo_github_id INTEGER NOT NULL,
    repo_full_name TEXT NOT NULL,
    change_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    detail TEXT,
    occurred_at TEXT,
    is_read INTEGER DEFAULT 0,
    FOREIGN KEY(subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    FOREIGN KEY(repo_github_id) REFERENCES repositories(github_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS search_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_str TEXT NOT NULL,
    target TEXT,
    created_at TEXT,
    result_count INTEGER DEFAULT 0
);

-- FTS5 全文索引
CREATE VIRTUAL TABLE IF NOT EXISTS repos_fts USING fts5(
    full_name,
    description,
    topics,
    tokenize = 'unicode61'
);

CREATE VIRTUAL TABLE IF NOT EXISTS evidence_fts USING fts5(
    repo_github_id UNINDEXED,
    readme_content,
    tokenize = 'unicode61'
);
