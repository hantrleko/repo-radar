"""
需求订阅、增量事件与水位线记录
"""
import sqlite3
from typing import List, Optional

from repo_radar.models.subscription import Subscription, ChangeEvent
from repo_radar.storage.db import get_connection

class SubscriptionStore:
    def __init__(self, db_path: str = None):
        self.db_path = db_path

    def _get_conn(self) -> sqlite3.Connection:
        return get_connection(self.db_path)

    def list_subscriptions(self, active_only: bool = False) -> List[Subscription]:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            if active_only:
                cursor.execute("SELECT * FROM subscriptions WHERE is_active = 1 ORDER BY id DESC")
            else:
                cursor.execute("SELECT * FROM subscriptions ORDER BY id DESC")
            return [
                Subscription(
                    id=row["id"],
                    name=row["name"],
                    query_str=row["query_str"],
                    domain=row["domain"],
                    frequency_days=row["frequency_days"],
                    last_checked_at=row["last_checked_at"],
                    last_pushed_watermark=row["last_pushed_watermark"],
                    is_active=bool(row["is_active"])
                ) for row in cursor.fetchall()
            ]
        finally:
            conn.close()

    def add_subscription(self, sub: Subscription) -> int:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO subscriptions (name, query_str, domain, frequency_days, last_checked_at, last_pushed_watermark, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                sub.name, sub.query_str, sub.domain, sub.frequency_days,
                sub.last_checked_at, sub.last_pushed_watermark, 1 if sub.is_active else 0
            ))
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()

    def update_watermark(self, sub_id: int, watermark_pushed_at: str) -> None:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE subscriptions
                SET last_checked_at = datetime('now'),
                    last_pushed_watermark = ?
                WHERE id = ?
            """, (watermark_pushed_at, sub_id))
            conn.commit()
        finally:
            conn.close()

    def delete_subscription(self, sub_id: int) -> None:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM subscriptions WHERE id = ?", (sub_id,))
            conn.commit()
        finally:
            conn.close()

    def record_change_event(self, event: ChangeEvent) -> int:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO change_events (
                    subscription_id, repo_github_id, repo_full_name, change_type,
                    old_value, new_value, detail, occurred_at, is_read
                ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
            """, (
                event.subscription_id, event.repo_github_id, event.repo_full_name,
                event.change_type, event.old_value, event.new_value, event.detail
            ))
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()

    def list_change_events(self, limit: int = 50, unread_only: bool = False) -> List[ChangeEvent]:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            if unread_only:
                cursor.execute("""
                    SELECT * FROM change_events
                    WHERE is_read = 0
                    ORDER BY occurred_at DESC LIMIT ?
                """, (limit,))
            else:
                cursor.execute("""
                    SELECT * FROM change_events
                    ORDER BY occurred_at DESC LIMIT ?
                """, (limit,))
            return [
                ChangeEvent(
                    id=row["id"],
                    subscription_id=row["subscription_id"],
                    repo_github_id=row["repo_github_id"],
                    repo_full_name=row["repo_full_name"],
                    change_type=row["change_type"],
                    old_value=row["old_value"],
                    new_value=row["new_value"],
                    detail=row["detail"],
                    occurred_at=row["occurred_at"],
                    is_read=bool(row["is_read"])
                ) for row in cursor.fetchall()
            ]
        finally:
            conn.close()

    def mark_all_as_read(self) -> None:
        conn = self._get_conn()
        try:
            cursor = conn.cursor()
            cursor.execute("UPDATE change_events SET is_read = 1")
            conn.commit()
        finally:
            conn.close()
