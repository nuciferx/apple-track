import json
import os
import gspread
from dotenv import load_dotenv

load_dotenv()

SHEET_HEADERS = [
    "source_hash", "bundle_id", "app_name",
    "duration_secs", "start_time", "end_time", "date_local"
]

def _get_worksheet():
    sa_key   = json.loads(os.environ["GCP_SA_KEY"])
    sheet_id = os.environ["SHEET_ID"]
    gc       = gspread.service_account_from_dict(sa_key)
    ws       = gc.open_by_key(sheet_id).sheet1

    # สร้าง header ถ้ายังไม่มี
    if not ws.row_values(1):
        ws.append_row(SHEET_HEADERS, value_input_option="USER_ENTERED")
        print("[uploader] Created sheet headers")

    return ws

def upsert_batch(records: list):
    if not records:
        print("[uploader] No records to upload")
        return

    ws = _get_worksheet()

    # ดึง source_hash ที่มีอยู่แล้วใน sheet (dedup)
    existing_hashes = set()
    try:
        col = ws.col_values(1)[1:]  # skip header
        existing_hashes = set(col)
        print(f"[uploader] Existing rows in sheet: {len(existing_hashes)}")
    except Exception as e:
        print(f"[uploader] Warning: could not read existing hashes: {e}")

    # กรองเฉพาะ record ใหม่
    new_records = [r for r in records if r["source_hash"] not in existing_hashes]
    print(f"[uploader] New records to append: {len(new_records)}")

    if not new_records:
        print("[uploader] Nothing new to upload")
        return

    # Append ทีละ batch
    BATCH_SIZE = 100
    total = 0
    for i in range(0, len(new_records), BATCH_SIZE):
        batch = new_records[i:i + BATCH_SIZE]
        rows = [
            [
                r["source_hash"],
                r["bundle_id"],
                r["app_name"],
                r["duration_secs"],
                r["start_time"],
                r["end_time"],
                r["date_local"],
            ]
            for r in batch
        ]
        ws.append_rows(rows, value_input_option="USER_ENTERED")
        total += len(batch)
        print(f"[uploader] Appended batch {i // BATCH_SIZE + 1}: {len(batch)} rows")

    print(f"[uploader] Done. Total appended: {total}")
