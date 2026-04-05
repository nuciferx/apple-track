import hashlib
import json
import os

# Bundle ID → ชื่อแอปที่อ่านง่าย
APP_NAMES = {
    "com.apple.mobilesafari": "Safari",
    "com.apple.mobilemail": "Mail",
    "com.apple.MobileSMS": "Messages",
    "com.apple.mobilephone": "Phone",
    "com.apple.camera": "Camera",
    "com.apple.photos": "Photos",
    "com.apple.maps": "Maps",
    "com.apple.Music": "Music",
    "com.apple.Preferences": "Settings",
    "com.google.chrome.ios": "Chrome",
    "com.google.youtube": "YouTube",
    "com.google.Gmail": "Gmail",
    "com.instagram.Instagram": "Instagram",
    "com.facebook.Facebook": "Facebook",
    "com.facebook.Messenger": "Messenger",
    "com.zhiliaoapp.musically": "TikTok",
    "com.spotify.client": "Spotify",
    "com.netflix.Netflix": "Netflix",
    "com.twitter.twitter": "X (Twitter)",
    "com.toyopagroup.piclab": "VSCO",
    "com.microsoft.teams": "Teams",
    "com.microsoft.Office.Outlook": "Outlook",
    "com.tencent.xin": "WeChat",
    "com.Line": "LINE",
}

def make_hash(bundle_id: str, start_time_str: str) -> str:
    raw = f"{bundle_id}::{start_time_str}"
    return hashlib.sha1(raw.encode()).hexdigest()

def process(records: list) -> list:
    result = []
    for r in records:
        start = r["start_time"]
        end = r["end_time"]
        bundle_id = r["bundle_id"]

        if start is None or r["duration_secs"] <= 0:
            continue

        start_str = start.isoformat()
        app_name = APP_NAMES.get(bundle_id, bundle_id.split(".")[-1].capitalize())

        result.append({
            "bundle_id": bundle_id,
            "app_name": app_name,
            "duration_secs": r["duration_secs"],
            "start_time": start_str,
            "end_time": end.isoformat() if end else None,
            "date_local": start.date().isoformat(),
            "source_hash": make_hash(bundle_id, start_str),
        })

    print(f"[transformer] Processed {len(result)} valid records")
    return result
