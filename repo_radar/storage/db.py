"""
SQLite 数据库连接与初始化 (支持 FTS5 与 WAL 模式，自动建表与默认数据植入)
"""
import sqlite3
from pathlib import Path
from typing import Generator, Set
from contextlib import contextmanager

from repo_radar.config import settings

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"

_INITIALIZED_PATHS: Set[str] = set()

def get_connection(db_path: str = None) -> sqlite3.Connection:
    path = db_path or settings.db_path
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    
    # 自动保证表结构已初始化
    if path not in _INITIALIZED_PATHS:
        init_db(path)
        _INITIALIZED_PATHS.add(path)

    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # 启用 WAL 模式提高并发性能
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db(db_path: str = None) -> None:
    path = db_path or settings.db_path
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, check_same_thread=False)
    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            sql_script = f.read()
        conn.executescript(sql_script)
        
        cursor = conn.cursor()
        # 1. 确保默认收藏夹存在
        cursor.execute("SELECT id FROM collections WHERE name = '默认收藏夹'")
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO collections (name, description, created_at) VALUES (?, ?, datetime('now'))",
                ("默认收藏夹", "系统初始默认收藏夹")
            )

        # 2. 确保四大领域默认监控订阅存在
        cursor.execute("SELECT COUNT(*) as cnt FROM subscriptions")
        if cursor.fetchone()[0] == 0:
            default_subs = [
                ("前沿宏观与面板计量", "panel data econometrics python", "金融与经济研究", 7),
                ("学术论文解析与LaTeX工具", "pdf extraction latex python", "学术研究", 7),
                ("量化策略回测与因子", "quantitative trading backtesting python", "量化交易", 7),
                ("AI动画与视频字幕创作", "manim whisper video python", "视频与图片创作", 7),
            ]
            for s_name, s_query, s_domain, s_freq in default_subs:
                cursor.execute("""
                    INSERT INTO subscriptions (name, query_str, domain, frequency_days, last_checked_at, is_active)
                    VALUES (?, ?, ?, ?, datetime('now'), 1)
                """, (s_name, s_query, s_domain, s_freq))

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
