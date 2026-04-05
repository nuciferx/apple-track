#!/usr/bin/env python3
"""
Apple Track - Screen Time Sync
อ่านข้อมูลจาก knowledgeC.db และ push ขึ้น Supabase
"""
import reader
import transformer
import uploader

def main():
    print("=== Apple Track Sync ===")
    records = reader.fetch_recent(limit=5000)
    processed = transformer.process(records)
    uploader.upsert_batch(processed)
    print("=== Sync Complete ===")

if __name__ == "__main__":
    main()
