"""
SQLite 数据库连接与初始化 (支持 FTS5 与 WAL 模式)
"""
import sqlite3
from pathlib import Path
from typing import Generator
from contextlib import contextmanager

from repo_radar.config import settings

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"

def get_connection(db_path: str = None) -> sqlite3.Connection:
    path = db_path or settings.db_path
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # 启用 WAL 模式提高读写并发性能
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db(db_path: str = None) -> None:
    conn = get_connection(db_path)
    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            sql_script = f.read()
        conn.executescript(sql_script)
        
        # 插入默认收藏夹
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM collections WHERE name = '默认收藏夹'")
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO collections (name, description, created_at) VALUES (?, ?, datetime('now'))",
                ("默认收藏夹", "系统初始默认收藏夹")
            )
        conn.commit()
    finally:
        conn.close()

@contextmanager
def db_session(db_path: str = None) -> Generator[sqlite3.Connection, None, None]:
    conn = get_connection(db_path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
