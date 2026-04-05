# Apple Track — Setup Guide

ดึงข้อมูล Screen Time จาก iPhone → แสดงผลเป็น Webapp บนมือถือ

---

## Architecture

```
Mac (knowledgeC.db)
→ Python sync script (ทุก 3 ชั่วโมง)
→ Supabase (cloud database)
→ Next.js Webapp (Vercel)
→ iPhone Browser
```

---

## ขั้นตอนที่ 1: Full Disk Access

ให้สิทธิ์ Terminal อ่านไฟล์ระบบ:

```
System Settings → Privacy & Security → Full Disk Access
→ กด + → เพิ่ม Terminal.app → เปิด Toggle
```

> หมายเหตุ: จำเป็นต้องทำก่อน ไม่งั้นอ่าน knowledgeC.db ไม่ได้

---

## ขั้นตอนที่ 2: Supabase

1. สร้าง project ที่ https://supabase.com (ฟรี)
2. ตั้งชื่อ: `apple-track`
3. เปิด SQL Editor แล้วรันไฟล์ตามลำดับ:

```sql
-- รันไฟล์ sql/01_create_tables.sql ก่อน
-- แล้วตามด้วย sql/02_create_views.sql
```

4. copy credentials จาก Project Settings → API:
   - Project URL
   - anon public key
   - service_role key (secret)

---

## ขั้นตอนที่ 3: ตั้งค่า Python Sync

```bash
cd sync

# สร้าง .env จาก template
cp .env.example .env
```

แก้ไข `sync/.env`:
```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

ติดตั้งและทดสอบ:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python sync.py
```

ถ้าเห็น `=== Sync Complete ===` แสดงว่าสำเร็จ

---

## ขั้นตอนที่ 4: Auto Sync (launchd)

แก้ไข `sync/com.appletrack.sync.plist` — เปลี่ยน `YOUR_USERNAME` และ path ให้ถูกต้อง:

```xml
<string>/Users/YOUR_USERNAME/path/to/apple-track/sync/.venv/bin/python3</string>
<string>/Users/YOUR_USERNAME/path/to/apple-track/sync/sync.py</string>
```

จากนั้นโหลด:
```bash
cp sync/com.appletrack.sync.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.appletrack.sync.plist
```

ดู log:
```bash
tail -f /tmp/appletrack.log
```

> Sync จะรันอัตโนมัติทุก 3 ชั่วโมง และรันทันทีทุกครั้งที่เปิด Mac

---

## ขั้นตอนที่ 5: Webapp

```bash
cd web

# ตั้งค่า environment
cp .env.local.example .env.local
```

แก้ไข `web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

ทดสอบ local:
```bash
npm install
npm run dev
# เปิด http://localhost:3000
```

---

## ขั้นตอนที่ 6: Deploy ขึ้น Vercel (ดูบน iPhone)

1. Push code ขึ้น GitHub
2. ไปที่ https://vercel.com → New Project → import repo
3. ตั้ง Root Directory เป็น `web`
4. เพิ่ม Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

เปิด URL บน iPhone Safari → Add to Home Screen สำหรับ app-like experience

---

## โครงสร้างโปรเจกต์

```
apple-track/
├── sync/
│   ├── sync.py                    # main entry point
│   ├── reader.py                  # อ่าน knowledgeC.db
│   ├── transformer.py             # แปลงข้อมูล + dedup
│   ├── uploader.py                # push ขึ้น Supabase
│   ├── requirements.txt
│   ├── .env                       # (สร้างจาก .env.example)
│   └── com.appletrack.sync.plist  # launchd auto-sync
├── sql/
│   ├── 01_create_tables.sql
│   └── 02_create_views.sql
├── web/
│   ├── app/
│   │   ├── page.tsx               # หน้า "วันนี้"
│   │   ├── week/page.tsx          # หน้า "7 วัน"
│   │   └── apps/page.tsx          # หน้า "แอปทั้งหมด"
│   ├── components/
│   │   ├── BottomNav.tsx
│   │   ├── StatCard.tsx
│   │   └── AppRow.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── formatters.ts
│   └── .env.local                 # (สร้างจาก .env.local.example)
└── SETUP.md                       # ไฟล์นี้
```

---

## Troubleshooting

| ปัญหา | แก้ไข |
|-------|--------|
| `Operation not permitted` | ให้สิทธิ์ Full Disk Access แก่ Terminal |
| `sync.py` ไม่พบข้อมูล | รัน debug: `python3 -c "import reader; print(reader.fetch_recent(10))"` |
| Webapp ไม่แสดงข้อมูล | ตรวจสอบ `.env.local` และ Supabase RLS policy |
| launchd ไม่รัน | ตรวจสอบ path ใน `.plist` และให้สิทธิ์ python binary ด้วย |

---

## iPhone Settings ที่ต้องเปิด

```
Settings → Screen Time → Share Across Devices → เปิด
```

เพื่อให้ข้อมูล iPhone sync มายัง Mac ผ่าน iCloud
