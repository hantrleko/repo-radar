"""
仓库数据持久化、GitHub ID 去重与全文检索
"""
import json
import sqlite3
from typing import List, Optional, Tuple

from repo_radar.models.repository import Repository, RepositoryTag
from repo_radar.models.evidence import EvidenceSnapshot, EvidenceAnalysis
from repo_radar.storage.db import get_connection

class RepoStore:
    def __init__(self, db_path: str = None):
        self.db_path = db_path

    def _get_conn(self) -> sqlite3.Connection:
        return get_connection(self.db_path)

    def save_repository(self, repo: Repository) -> bool:
        """保存或更新仓库，以 github_id 作为物理主键严格去重"""
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            topics_json = json.dumps(repo.topics, ensure_ascii=False)
            cursor.execute("""
                INSERT INTO repositories (
                    github_id, full_name, owner, name, description, html_url,
                    default_branch, stars, forks, open_issues, language,
                    license_spdx, pushed_at, created_at, updated_at,
                    is_archived, is_fork, topics, homepage, last_scraped_at, scrape_error
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
                ON CONFLICT(github_id) DO UPDATE SET
                    full_name = excluded.full_name,
                    owner = excluded.owner,
                    name = excluded.name,
                    description = excluded.description,
                    html_url = excluded.html_url,
                    default_branch = excluded.default_branch,
                    stars = excluded.stars,
                    forks = excluded.forks,
                    open_issues = excluded.open_issues,
                    language = excluded.language,
                    license_spdx = excluded.license_spdx,
                    pushed_at = excluded.pushed_at,
                    updated_at = excluded.updated_at,
                    is_archived = excluded.is_archived,
                    is_fork = excluded.is_fork,
                    topics = excluded.topics,
                    homepage = excluded.homepage,
                    last_scraped_at = datetime('now'),
                    scrape_error = excluded.scrape_error
            """, (
                repo.github_id, repo.full_name, repo.owner, repo.name,
                repo.description, repo.html_url, repo.default_branch,
                repo.stars, repo.forks, repo.open_issues, repo.language,
                repo.license_spdx, repo.pushed_at, repo.created_at, repo.updated_at,
                1 if repo.is_archived else 0, 1 if repo.is_fork else 0,
                topics_json, repo.homepage, repo.scrape_error
            ))
            
            # 同步更新 FTS5 索引
            cursor.execute("DELETE FROM repos_fts WHERE rowid = ?", (repo.github_id,))
            cursor.execute("""
                INSERT INTO repos_fts (rowid, full_name, description, topics)
                VALUES (?, ?, ?, ?)
            """, (repo.github_id, repo.full_name, repo.description or "", " ".join(repo.topics)))
            
            conn.commit()
            return True
        finally:
            conn.close()

    def get_repository(self, github_id: int) -> Optional[Repository]:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repositories WHERE github_id = ?", (github_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_repo(row)
        finally:
            conn.close()

    def get_repository_by_name(self, full_name: str) -> Optional[Repository]:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repositories WHERE full_name = ? COLLATE NOCASE", (full_name,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_repo(row)
        finally:
            conn.close()

    def save_evidence_snapshot(self, snapshot: EvidenceSnapshot) -> int:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO evidence_snapshots (
                    repo_github_id, commit_sha, content_hash, readme_text,
                    requirements_text, license_text, captured_at
                ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            """, (
                snapshot.repo_github_id, snapshot.commit_sha, snapshot.content_hash,
                snapshot.readme_text, snapshot.requirements_text, snapshot.license_text
            ))
            snapshot_id = cursor.lastrowid
            
            # 更新 README 全文索引
            cursor.execute("DELETE FROM evidence_fts WHERE repo_github_id = ?", (snapshot.repo_github_id,))
            cursor.execute("""
                INSERT INTO evidence_fts (repo_github_id, readme_content)
                VALUES (?, ?)
            """, (snapshot.repo_github_id, snapshot.readme_text or ""))
            
            conn.commit()
            return snapshot_id
        finally:
            conn.close()

    def get_latest_snapshot(self, repo_github_id: int) -> Optional[EvidenceSnapshot]:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM evidence_snapshots
                WHERE repo_github_id = ?
                ORDER BY id DESC LIMIT 1
            """, (repo_github_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return EvidenceSnapshot(
                id=row["id"],
                repo_github_id=row["repo_github_id"],
                commit_sha=row["commit_sha"],
                content_hash=row["content_hash"],
                readme_text=row["readme_text"] or "",
                requirements_text=row["requirements_text"],
                license_text=row["license_text"],
                captured_at=row["captured_at"]
            )
        finally:
            conn.close()

    def save_evidence_analysis(self, analysis: EvidenceAnalysis) -> None:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO evidence_analyses (
                    repo_github_id, chinese_purpose, scenarios, satisfied_conditions,
                    unsatisfied_conditions, unknown_conditions, os_compatibility,
                    gpu_requirement, external_dependencies, license_summary,
                    maintenance_status, evidence_snippets, model_used, analyzed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                ON CONFLICT(repo_github_id) DO UPDATE SET
                    chinese_purpose = excluded.chinese_purpose,
                    scenarios = excluded.scenarios,
                    satisfied_conditions = excluded.satisfied_conditions,
                    unsatisfied_conditions = excluded.unsatisfied_conditions,
                    unknown_conditions = excluded.unknown_conditions,
                    os_compatibility = excluded.os_compatibility,
                    gpu_requirement = excluded.gpu_requirement,
                    external_dependencies = excluded.external_dependencies,
                    license_summary = excluded.license_summary,
                    maintenance_status = excluded.maintenance_status,
                    evidence_snippets = excluded.evidence_snippets,
                    model_used = excluded.model_used,
                    analyzed_at = datetime('now')
            """, (
                analysis.repo_github_id,
                analysis.chinese_purpose,
                json.dumps(analysis.scenarios, ensure_ascii=False),
                json.dumps(analysis.satisfied_conditions, ensure_ascii=False),
                json.dumps(analysis.unsatisfied_conditions, ensure_ascii=False),
                json.dumps(analysis.unknown_conditions, ensure_ascii=False),
                json.dumps(analysis.os_compatibility, ensure_ascii=False),
                analysis.gpu_requirement,
                json.dumps(analysis.external_dependencies, ensure_ascii=False),
                analysis.license_summary,
                analysis.maintenance_status,
                json.dumps(analysis.evidence_snippets, ensure_ascii=False),
                analysis.model_used
            ))
            conn.commit()
        finally:
            conn.close()

    def get_evidence_analysis(self, repo_github_id: int) -> Optional[EvidenceAnalysis]:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM evidence_analyses WHERE repo_github_id = ?", (repo_github_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return EvidenceAnalysis(
                repo_github_id=row["repo_github_id"],
                chinese_purpose=row["chinese_purpose"] or "",
                scenarios=json.loads(row["scenarios"] or "[]"),
                satisfied_conditions=json.loads(row["satisfied_conditions"] or "[]"),
                unsatisfied_conditions=json.loads(row["unsatisfied_conditions"] or "[]"),
                unknown_conditions=json.loads(row["unknown_conditions"] or "[]"),
                os_compatibility=json.loads(row["os_compatibility"] or "{}"),
                gpu_requirement=row["gpu_requirement"] or "未知",
                external_dependencies=json.loads(row["external_dependencies"] or "[]"),
                license_summary=row["license_summary"] or "未知",
                maintenance_status=row["maintenance_status"] or "活跃",
                evidence_snippets=json.loads(row["evidence_snippets"] or "[]"),
                model_used=row["model_used"],
                analyzed_at=row["analyzed_at"]
            )
        finally:
            conn.close()

    def save_tag(self, tag: RepositoryTag) -> None:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            # 人工标签优先，若已有 is_manual=1 则不被自动覆盖
            cursor.execute("""
                INSERT INTO repo_tags (repo_github_id, domain, subcategory, capability, modality, is_manual)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(repo_github_id, domain, subcategory, capability, modality)
                DO UPDATE SET is_manual = CASE WHEN repo_tags.is_manual = 1 THEN 1 ELSE excluded.is_manual END
            """, (
                tag.repo_github_id, tag.domain, tag.subcategory,
                tag.capability, tag.modality, 1 if tag.is_manual else 0
            ))
            conn.commit()
        finally:
            conn.close()

    def get_tags_for_repo(self, repo_github_id: int) -> List[RepositoryTag]:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repo_tags WHERE repo_github_id = ?", (repo_github_id,))
            tags = []
            for row in cursor.fetchall():
                tags.append(RepositoryTag(
                    repo_github_id=row["repo_github_id"],
                    domain=row["domain"],
                    subcategory=row["subcategory"],
                    capability=row["capability"],
                    modality=row["modality"],
                    is_manual=bool(row["is_manual"])
                ))
            return tags
        finally:
            conn.close()

    def list_repos_by_domain(self, domain: str, subcategory: str = None) -> List[Repository]:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            if subcategory:
                cursor.execute("""
                    SELECT DISTINCT r.* FROM repositories r
                    JOIN repo_tags t ON r.github_id = t.repo_github_id
                    WHERE t.domain = ? AND t.subcategory = ?
                    ORDER BY r.stars DESC
                """, (domain, subcategory))
            else:
                cursor.execute("""
                    SELECT DISTINCT r.* FROM repositories r
                    JOIN repo_tags t ON r.github_id = t.repo_github_id
                    WHERE t.domain = ?
                    ORDER BY r.stars DESC
                """, (domain,))
            return [self._row_to_repo(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    def list_all_repos(self, limit: int = 200) -> List[Repository]:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repositories ORDER BY stars DESC LIMIT ?", (limit,))
            return [self._row_to_repo(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    def search_local_fts(self, query_text: str, limit: int = 30) -> List[Repository]:
        """使用 SQLite FTS5 在本地已收录仓库和 README 中全文搜索"""
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            # 简单清洗 FTS 查询词，支持空格
            tokens = [t.strip().replace('"', '""') for t in query_text.split() if t.strip()]
            if not tokens:
                return []
            match_str = " OR ".join([f'"{t}"' for t in tokens])
            
            cursor.execute("""
                SELECT DISTINCT r.* FROM repositories r
                WHERE r.github_id IN (
                    SELECT rowid FROM repos_fts WHERE repos_fts MATCH ?
                    UNION
                    SELECT repo_github_id FROM evidence_fts WHERE evidence_fts MATCH ?
                )
                ORDER BY r.stars DESC LIMIT ?
            """, (match_str, match_str, limit))
            return [self._row_to_repo(row) for row in cursor.fetchall()]
        except Exception:
            return []
        finally:
            conn.close()

    def _row_to_repo(self, row: sqlite3.Row) -> Repository:
        return Repository(
            github_id=row["github_id"],
            full_name=row["full_name"],
            owner=row["owner"],
            name=row["name"],
            description=row["description"],
            html_url=row["html_url"],
            default_branch=row["default_branch"],
            stars=row["stars"],
            forks=row["forks"],
            open_issues=row["open_issues"],
            language=row["language"],
            license_spdx=row["license_spdx"],
            pushed_at=row["pushed_at"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            is_archived=bool(row["is_archived"]),
            is_fork=bool(row["is_fork"]),
            topics=json.loads(row["topics"] or "[]"),
            homepage=row["homepage"],
            last_scraped_at=row["last_scraped_at"],
            scrape_error=row["scrape_error"]
        )
