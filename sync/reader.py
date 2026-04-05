import sqlite3
import shutil
import tempfile
import datetime
from pathlib import Path

DB_PATH = Path.home() / "Library/Application Support/Knowledge/knowledgeC.db"
APPLE_EPOCH_OFFSET = 978_307_200


def apple_to_datetime(ts):
    if ts is None:
        return None
    return datetime.datetime.fromtimestamp(ts + APPLE_EPOCH_OFFSET, tz=datetime.timezone.utc)


def _copy_db_to_temp() -> Path:
    """Copy knowledgeC.db + WAL files to temp dir to avoid lock conflicts."""
    tmp_dir = Path(tempfile.mkdtemp())
    tmp_db = tmp_dir / "kc.db"
    shutil.copy2(DB_PATH, tmp_db)
    for suffix in ("-wal", "-shm"):
        src = DB_PATH.parent / (DB_PATH.name + suffix)
        if src.exists():
            shutil.copy2(src, tmp_dir / ("kc.db" + suffix))
    return tmp_db


def fetch_recent(limit=5000):
    tmp_db = _copy_db_to_temp()
    conn = sqlite3.connect(f"file:{tmp_db}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row

    # Debug: ดู stream names ที่มีในฐานข้อมูล
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT ZSTREAMNAME FROM ZOBJECT WHERE ZSTREAMNAME LIKE '/app/%' LIMIT 10")
    streams = [r[0] for r in cur.fetchall()]
    print(f"[reader] App streams found: {streams}")

    rows = conn.execute("""
        SELECT
            ZVALUESTRING        AS bundle_id,
            ZSTARTDATE,
            ZENDDATE,
            (ZENDDATE - ZSTARTDATE) AS duration_secs
        FROM ZOBJECT
        WHERE
            ZSTREAMNAME = '/app/usage'
            AND ZVALUESTRING IS NOT NULL
            AND ZENDDATE > ZSTARTDATE
        ORDER BY ZSTARTDATE DESC
        LIMIT ?
    """, (limit,)).fetchall()

    conn.close()

    result = []
    for r in rows:
        result.append({
            "bundle_id": r["bundle_id"],
            "duration_secs": int(r["duration_secs"]),
            "start_time": apple_to_datetime(r["ZSTARTDATE"]),
            "end_time": apple_to_datetime(r["ZENDDATE"]),
        })

    print(f"[reader] Fetched {len(result)} records")
    return result
