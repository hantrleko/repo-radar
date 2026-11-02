"""
收藏夹、多集合归类、评估状态与笔记管理
"""
import csv
import io
import json
import sqlite3
from typing import Dict, List, Optional, Tuple

from repo_radar.models.collection import Collection, CollectionItem
from repo_radar.models.repository import Repository
from repo_radar.storage.db import get_connection
from repo_radar.storage.repo_store import RepoStore

class CollectionStore:
    def __init__(self, db_path: str = None):
        self.db_path = db_path
        self.repo_store = RepoStore(db_path)

    def _get_conn(self) -> sqlite3.Connection:
        return get_connection(self.db_path)

    def list_collections(self) -> List[Collection]:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM collections ORDER BY id ASC")
            return [
                Collection(
                    id=row["id"],
                    name=row["name"],
                    description=row["description"],
                    created_at=row["created_at"]
                ) for row in cursor.fetchall()
            ]
        finally:
            conn.close()

    def create_collection(self, name: str, description: str = "") -> int:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO collections (name, description, created_at) VALUES (?, ?, datetime('now'))",
                (name, description)
            )
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()

    def add_or_update_item(self, item: CollectionItem) -> None:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            tags_json = json.dumps(item.custom_tags, ensure_ascii=False)
            cursor.execute("""
                INSERT INTO collection_items (
                    collection_id, repo_github_id, evaluation_status, user_notes,
                    custom_tags, added_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                ON CONFLICT(collection_id, repo_github_id) DO UPDATE SET
                    evaluation_status = excluded.evaluation_status,
                    user_notes = excluded.user_notes,
                    custom_tags = excluded.custom_tags,
                    updated_at = datetime('now')
            """, (
                item.collection_id, item.repo_github_id, item.evaluation_status,
                item.user_notes, tags_json
            ))
            conn.commit()
        finally:
            conn.close()

    def remove_item(self, collection_id: int, repo_github_id: int) -> None:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM collection_items WHERE collection_id = ? AND repo_github_id = ?",
                (collection_id, repo_github_id)
            )
            conn.commit()
        finally:
            conn.close()

    def get_item(self, collection_id: int, repo_github_id: int) -> Optional[CollectionItem]:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM collection_items WHERE collection_id = ? AND repo_github_id = ?",
                (collection_id, repo_github_id)
            )
            row = cursor.fetchone()
            if not row:
                return None
            return CollectionItem(
                collection_id=row["collection_id"],
                repo_github_id=row["repo_github_id"],
                evaluation_status=row["evaluation_status"],
                user_notes=row["user_notes"] or "",
                custom_tags=json.loads(row["custom_tags"] or "[]"),
                added_at=row["added_at"],
                updated_at=row["updated_at"]
            )
        finally:
            conn.close()

    def list_items_with_repo(self, collection_id: int = None, status: str = None) -> List[Tuple[CollectionItem, Repository]]:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            query = """
                SELECT ci.*, r.* FROM collection_items ci
                JOIN repositories r ON ci.repo_github_id = r.github_id
                WHERE 1=1
            """
            params = []
            if collection_id is not None:
                query += " AND ci.collection_id = ?"
                params.append(collection_id)
            if status is not None and status != "全部":
                query += " AND ci.evaluation_status = ?"
                params.append(status)
            query += " ORDER BY ci.updated_at DESC"
            
            cursor.execute(query, params)
            results = []
            for row in cursor.fetchall():
                item = CollectionItem(
                    collection_id=row["collection_id"],
                    repo_github_id=row["repo_github_id"],
                    evaluation_status=row["evaluation_status"],
                    user_notes=row["user_notes"] or "",
                    custom_tags=json.loads(row["custom_tags"] or "[]"),
                    added_at=row["added_at"],
                    updated_at=row["updated_at"]
                )
                repo = self.repo_store._row_to_repo(row)
                results.append((item, repo))
            return results
        finally:
            conn.close()

    def export_collection_json(self, collection_id: int = None) -> str:
        items = self.list_items_with_repo(collection_id)
        data = []
        for ci, r in items:
            data.append({
                "collection_id": ci.collection_id,
                "github_id": r.github_id,
                "full_name": r.full_name,
                "html_url": r.html_url,
                "stars": r.stars,
                "language": r.language,
                "license": r.license_spdx,
                "evaluation_status": ci.evaluation_status,
                "user_notes": ci.user_notes,
                "custom_tags": ci.custom_tags,
                "added_at": ci.added_at,
            })
        return json.dumps(data, ensure_ascii=False, indent=2)

    def export_collection_csv(self, collection_id: int = None) -> str:
        items = self.list_items_with_repo(collection_id)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["GitHub ID", "仓库全称", "链接", "Star数", "编程语言", "许可证", "评估状态", "用户笔记", "标签", "加入时间"])
        for ci, r in items:
            writer.writerow([
                r.github_id,
                r.full_name,
                r.html_url,
                r.stars,
                r.language or "",
                r.license_spdx or "",
                ci.evaluation_status,
                ci.user_notes,
                ";".join(ci.custom_tags),
                ci.added_at or "",
            ])
        return output.getvalue()
