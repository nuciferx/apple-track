#!/usr/bin/env python3
"""
macOS Screen Time Reader - knowledgeC.db
========================================
Reads app usage data from Apple's knowledgeC.db SQLite database.

Database location:
    ~/Library/Application Support/Knowledge/knowledgeC.db

Permission requirement (macOS Ventura/Sonoma/Sequoia):
    System Settings > Privacy & Security > Full Disk Access
    -> Enable for Terminal (or iTerm2, VS Code, etc.)

Sources / references:
    - https://github.com/FelixKohlhas/ScreenFlux
    - https://github.com/CodyBontecou/screentime-analyzer
    - https://github.com/tomoyanakano/obsidian-screentime-tracker
    - https://github.com/ydkhatri/mac_apt/blob/master/plugins/screentime.py
    - https://rud.is/b/2019/10/28/spelunking-macos-screentime-app-usage-with-r/
"""

import os
import shutil
import sqlite3
import tempfile
from datetime import datetime, timedelta, date
from pathlib import Path
from typing import Optional


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Apple CoreData timestamps count seconds since 2001-01-01 00:00:00 UTC.
# Unix timestamps count seconds since 1970-01-01 00:00:00 UTC.
# Difference = 978,307,200 seconds  (31 years)
APPLE_EPOCH_OFFSET = 978_307_200

# Default knowledgeC.db path
DB_PATH = Path.home() / "Library/Application Support/Knowledge/knowledgeC.db"


# ---------------------------------------------------------------------------
# Timestamp helpers
# ---------------------------------------------------------------------------

def apple_ts_to_unix(apple_ts: float) -> float:
    """Add 978307200 to convert Apple CoreData seconds → Unix epoch seconds."""
    return apple_ts + APPLE_EPOCH_OFFSET


def apple_ts_to_datetime(apple_ts: Optional[float]) -> Optional[datetime]:
    """Convert Apple CoreData timestamp to a Python datetime (local time)."""
    if apple_ts is None:
        return None
    return datetime.fromtimestamp(apple_ts_to_unix(apple_ts))


def datetime_to_apple_ts(dt: datetime) -> float:
    """Convert a Python datetime to Apple CoreData timestamp."""
    return dt.timestamp() - APPLE_EPOCH_OFFSET


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def check_db_access(db_path: Path = DB_PATH) -> None:
    """Raise a clear error if the database cannot be read."""
    if not db_path.exists():
        raise FileNotFoundError(
            f"knowledgeC.db not found at:\n  {db_path}\n"
            "Make sure Screen Time is enabled on this Mac."
        )
    if not os.access(db_path, os.R_OK):
        raise PermissionError(
            f"Cannot read {db_path}\n\n"
            "FIX: Grant Full Disk Access to your terminal app:\n"
            "  System Settings > Privacy & Security > Full Disk Access\n"
            "  -> Add Terminal (or iTerm2 / VS Code / your Python binary)"
        )


def copy_db_to_temp(db_path: Path = DB_PATH) -> Path:
    """
    Copy the database (+ WAL/SHM) to a temp directory.

    knowledgeC.db is often held open by the Knowledge daemon, so reading it
    directly can raise 'database is locked'. Copying the file first sidesteps
    this problem.  The WAL/SHM files are copied too so the copy is consistent.
    """
    tmp_dir = Path(tempfile.mkdtemp(prefix="screentime_"))
    tmp_db  = tmp_dir / "knowledgeC.db"
    shutil.copy2(db_path, tmp_db)

    for suffix in ("-wal", "-shm"):
        src = db_path.parent / (db_path.name + suffix)
        if src.exists():
            shutil.copy2(src, tmp_dir / (tmp_db.name + suffix))

    return tmp_db


def open_db(db_path: Path) -> sqlite3.Connection:
    """Open a database in read-only mode using URI syntax."""
    # uri=True + ?mode=ro prevents any accidental writes to the live DB.
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


# ---------------------------------------------------------------------------
# Core SQL queries
# ---------------------------------------------------------------------------

# ── Query 1: raw session rows ──────────────────────────────────────────────
#
# ZOBJECT is the main events table.  Each row represents one session of
# foreground use.  Relevant columns:
#
#   ZSTREAMNAME   - event category (we want '/app/usage')
#   ZVALUESTRING  - bundle ID or process name  e.g. "com.apple.Safari"
#   ZSTARTDATE    - session start  (Apple CoreData timestamp)
#   ZENDDATE      - session end    (Apple CoreData timestamp)
#   ZSECONDSFROMGMT - timezone offset in seconds
#
# The LEFT JOINs add device information from synced iOS/iPadOS devices.
RAW_SESSIONS_SQL = """
SELECT
    ZOBJECT.ZVALUESTRING                            AS app,
    (ZOBJECT.ZENDDATE - ZOBJECT.ZSTARTDATE)         AS duration_seconds,
    (ZOBJECT.ZSTARTDATE + 978307200)                AS start_unix,
    (ZOBJECT.ZENDDATE   + 978307200)                AS end_unix,
    (ZOBJECT.ZCREATIONDATE + 978307200)             AS created_unix,
    ZOBJECT.ZSECONDSFROMGMT                         AS tz_offset_seconds,
    ZSOURCE.ZDEVICEID                               AS device_id,
    ZSYNCPEER.ZMODEL                                AS device_model
FROM
    ZOBJECT
    LEFT JOIN ZSTRUCTUREDMETADATA
        ON ZOBJECT.ZSTRUCTUREDMETADATA = ZSTRUCTUREDMETADATA.Z_PK
    LEFT JOIN ZSOURCE
        ON ZOBJECT.ZSOURCE = ZSOURCE.Z_PK
    LEFT JOIN ZSYNCPEER
        ON ZSOURCE.ZDEVICEID = ZSYNCPEER.ZDEVICEID
WHERE
    ZOBJECT.ZSTREAMNAME = '/app/usage'      -- only app-usage events
    AND ZOBJECT.ZVALUESTRING IS NOT NULL    -- skip null bundle IDs
    AND ZOBJECT.ZENDDATE > ZOBJECT.ZSTARTDATE  -- skip zero-duration rows
ORDER BY
    ZOBJECT.ZSTARTDATE DESC
"""

# ── Query 2: daily totals per app ─────────────────────────────────────────
#
# Uses SQLite's date() with 'unixepoch' + 'localtime' modifiers so the day
# boundary follows the local clock (not UTC).
DAILY_TOTALS_SQL = """
SELECT
    date(ZSTARTDATE + 978307200, 'unixepoch', 'localtime')  AS day,
    ZVALUESTRING                                             AS app,
    SUM(ZENDDATE - ZSTARTDATE)                              AS total_seconds,
    COUNT(*)                                                 AS session_count
FROM
    ZOBJECT
WHERE
    ZSTREAMNAME = '/app/usage'
    AND ZVALUESTRING IS NOT NULL
    AND ZENDDATE > ZSTARTDATE
    {date_filter}
GROUP BY
    day, app
ORDER BY
    day DESC, total_seconds DESC
"""

# ── Query 3: single-day filtered sessions (used by obsidian-screentime) ──
DAY_SESSIONS_SQL = """
SELECT
    ZVALUESTRING                                                    AS app,
    strftime('%H:%M:%S', ZSTARTDATE + 978307200, 'unixepoch', 'localtime')  AS start_local,
    strftime('%H:%M:%S', ZENDDATE   + 978307200, 'unixepoch', 'localtime')  AS end_local,
    CAST(ROUND(ZENDDATE - ZSTARTDATE) AS INTEGER)                  AS duration_seconds
FROM
    ZOBJECT
WHERE
    ZSTREAMNAME = '/app/usage'
    AND date(ZSTARTDATE + 978307200, 'unixepoch', 'localtime') = ?
    AND ZENDDATE > ZSTARTDATE
ORDER BY
    ZSTARTDATE
"""

# ── Other stream names you may find useful ────────────────────────────────
# '/app/usage'                 - foreground app usage (what we use)
# '/app/webUsage'              - Safari / browser URL usage
# '/display/isOn'              - screen on/off events
# '/device/isLocked'           - lock/unlock events
# '/user/isSleeping'           - device sleep events
# '/device/batteryPercentage'  - battery readings


# ---------------------------------------------------------------------------
# High-level Python API
# ---------------------------------------------------------------------------

def get_raw_sessions(
    db_path: Path = DB_PATH,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> list[dict]:
    """
    Return individual app usage sessions as a list of dicts.

    Each dict has:
        app              (str)  - bundle ID / process name
        duration_seconds (int)
        start_time       (datetime)
        end_time         (datetime)
        device_id        (str | None)
        device_model     (str | None)
    """
    check_db_access(db_path)
    tmp = copy_db_to_temp(db_path)
    try:
        conn = open_db(tmp)

        sql = RAW_SESSIONS_SQL
        params: list = []

        if start_date or end_date:
            conditions = []
            if start_date:
                conditions.append("AND ZOBJECT.ZSTARTDATE >= ?")
                params.append(datetime_to_apple_ts(start_date))
            if end_date:
                conditions.append("AND ZOBJECT.ZENDDATE <= ?")
                params.append(datetime_to_apple_ts(end_date))
            # Inject extra WHERE conditions (they go after existing WHERE clause)
            sql = sql.replace(
                "ORDER BY\n    ZOBJECT.ZSTARTDATE DESC",
                "\n    ".join(conditions) + "\nORDER BY\n    ZOBJECT.ZSTARTDATE DESC",
            )

        rows = conn.execute(sql, params).fetchall()
        conn.close()

        return [
            {
                "app":              row["app"],
                "duration_seconds": int(row["duration_seconds"] or 0),
                "start_time":       datetime.fromtimestamp(row["start_unix"]),
                "end_time":         datetime.fromtimestamp(row["end_unix"]),
                "device_id":        row["device_id"],
                "device_model":     row["device_model"],
            }
            for row in rows
        ]
    finally:
        shutil.rmtree(tmp.parent, ignore_errors=True)


def get_daily_totals(
    db_path: Path = DB_PATH,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> list[dict]:
    """
    Return total usage per app per day.

    Each dict has:
        day            (str)  - 'YYYY-MM-DD'
        app            (str)
        total_seconds  (int)
        session_count  (int)
    """
    check_db_access(db_path)
    tmp = copy_db_to_temp(db_path)
    try:
        conn = open_db(tmp)

        filter_parts: list[str] = []
        params: list = []

        if start_date:
            filter_parts.append("AND date(ZSTARTDATE + 978307200, 'unixepoch', 'localtime') >= ?")
            params.append(str(start_date))
        if end_date:
            filter_parts.append("AND date(ZSTARTDATE + 978307200, 'unixepoch', 'localtime') <= ?")
            params.append(str(end_date))

        sql = DAILY_TOTALS_SQL.format(date_filter="\n    ".join(filter_parts))
        rows = conn.execute(sql, params).fetchall()
        conn.close()

        return [
            {
                "day":           row["day"],
                "app":           row["app"],
                "total_seconds": int(row["total_seconds"] or 0),
                "session_count": row["session_count"],
            }
            for row in rows
        ]
    finally:
        shutil.rmtree(tmp.parent, ignore_errors=True)


def get_day_sessions(
    target_date: str,          # "YYYY-MM-DD"
    db_path: Path = DB_PATH,
) -> list[dict]:
    """
    Return every app session for a single calendar day (local time).

    Each dict has:
        app              (str)
        start_local      (str)  - 'HH:MM:SS'
        end_local        (str)  - 'HH:MM:SS'
        duration_seconds (int)
    """
    check_db_access(db_path)
    tmp = copy_db_to_temp(db_path)
    try:
        conn = open_db(tmp)
        rows = conn.execute(DAY_SESSIONS_SQL, [target_date]).fetchall()
        conn.close()
        return [dict(row) for row in rows]
    finally:
        shutil.rmtree(tmp.parent, ignore_errors=True)


# ---------------------------------------------------------------------------
# Utility: pretty-print helpers
# ---------------------------------------------------------------------------

def format_duration(seconds: int) -> str:
    """Return a human-readable duration string, e.g. '2h 14m 7s'."""
    if seconds <= 0:
        return "0s"
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    parts = []
    if h:
        parts.append(f"{h}h")
    if m:
        parts.append(f"{m}m")
    if s or not parts:
        parts.append(f"{s}s")
    return " ".join(parts)


def print_daily_summary(rows: list[dict], top_n: int = 15) -> None:
    """Pretty-print daily totals grouped by day."""
    from collections import defaultdict

    by_day: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_day[r["day"]].append(r)

    for day in sorted(by_day.keys(), reverse=True):
        apps   = sorted(by_day[day], key=lambda x: x["total_seconds"], reverse=True)
        total  = sum(a["total_seconds"] for a in apps)
        dt_day = datetime.strptime(day, "%Y-%m-%d")

        print(f"\n{'='*62}")
        print(f"  {dt_day.strftime('%A, %d %B %Y')}   (total {format_duration(total)})")
        print(f"{'='*62}")

        max_secs = apps[0]["total_seconds"] if apps else 1
        for i, a in enumerate(apps[:top_n], 1):
            name   = a["app"][:42] + "…" if len(a["app"]) > 43 else a["app"]
            bar    = "█" * int(a["total_seconds"] / max_secs * 18)
            print(f"  {i:2}. {name:<44} {format_duration(a['total_seconds']):>10}  {bar}")
    print()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="Read macOS Screen Time data from knowledgeC.db",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python screentime_reader.py                    # all data, daily summary
  python screentime_reader.py --days 7           # last 7 days
  python screentime_reader.py --date 2025-04-01  # single day, all sessions
  python screentime_reader.py --days 30 --top 5  # top 5 apps, last 30 days
  python screentime_reader.py --list-streams     # show all stream types in DB

Full Disk Access is required for the running application (Terminal / iTerm2 /
VS Code …).  Add it in:
  System Settings > Privacy & Security > Full Disk Access
        """,
    )
    parser.add_argument("--db",           default=str(DB_PATH), help="Path to knowledgeC.db")
    parser.add_argument("--days",         type=int, default=None, help="Show last N days")
    parser.add_argument("--date",         default=None,           help="Show single day YYYY-MM-DD")
    parser.add_argument("--top",          type=int, default=15,   help="Top N apps per day")
    parser.add_argument("--list-streams", action="store_true",    help="List all ZSTREAMNAME values")
    args = parser.parse_args()

    db_path = Path(args.db)

    # -- list stream names ------------------------------------------------
    if args.list_streams:
        check_db_access(db_path)
        tmp = copy_db_to_temp(db_path)
        try:
            conn = open_db(tmp)
            sql  = "SELECT DISTINCT ZSTREAMNAME, COUNT(*) AS cnt FROM ZOBJECT GROUP BY ZSTREAMNAME ORDER BY cnt DESC"
            rows = conn.execute(sql).fetchall()
            conn.close()
            print(f"\n{'Stream name':<45}  {'Rows':>8}")
            print("-" * 58)
            for r in rows:
                print(f"  {r['ZSTREAMNAME']:<43}  {r['cnt']:>8,}")
        finally:
            shutil.rmtree(tmp.parent, ignore_errors=True)
        return

    # -- single day -------------------------------------------------------
    if args.date:
        print(f"\nSessions on {args.date}:")
        sessions = get_day_sessions(args.date, db_path)
        if not sessions:
            print("  No sessions found.")
            return
        # Aggregate by app for this day
        from collections import defaultdict
        totals: dict[str, int] = defaultdict(int)
        for s in sessions:
            totals[s["app"]] += s["duration_seconds"]
        print(f"\n  {'App':<45}  {'Duration':>10}  {'Sessions':>8}")
        print("  " + "-" * 66)
        for app, secs in sorted(totals.items(), key=lambda x: -x[1]):
            name = app[:44] + "…" if len(app) > 45 else app
            cnt  = sum(1 for s in sessions if s["app"] == app)
            print(f"  {name:<45}  {format_duration(secs):>10}  {cnt:>8}")
        print(f"\n  Total: {format_duration(sum(totals.values()))}")
        return

    # -- daily summary (last N days or all time) --------------------------
    start: Optional[date] = None
    if args.days:
        start = date.today() - timedelta(days=args.days)
    rows = get_daily_totals(db_path, start_date=start)

    if not rows:
        print("No Screen Time data found.")
        return

    print_daily_summary(rows, top_n=args.top)


if __name__ == "__main__":
    main()
