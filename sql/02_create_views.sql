-- Run this after 01_create_tables.sql

-- สรุปรายวันต่อแอป
CREATE OR REPLACE VIEW daily_app_summary AS
SELECT
  date_local,
  bundle_id,
  app_name,
  SUM(duration_secs)       AS total_secs,
  COUNT(*)                 AS session_count,
  MIN(start_time)          AS first_use,
  MAX(end_time)            AS last_use
FROM screen_time_events
GROUP BY date_local, bundle_id, app_name
ORDER BY date_local DESC, total_secs DESC;

-- สรุป 7 วันล่าสุดต่อแอป
CREATE OR REPLACE VIEW weekly_app_summary AS
SELECT
  bundle_id,
  app_name,
  SUM(duration_secs)          AS total_secs_7d,
  COUNT(DISTINCT date_local)  AS days_active
FROM screen_time_events
WHERE date_local >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY bundle_id, app_name
ORDER BY total_secs_7d DESC;
