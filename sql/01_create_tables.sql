-- Run this in Supabase SQL Editor

CREATE TABLE screen_time_events (
  id              BIGSERIAL PRIMARY KEY,
  bundle_id       TEXT        NOT NULL,
  app_name        TEXT,
  duration_secs   INTEGER     NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ,
  date_local      DATE        NOT NULL,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  source_hash     TEXT        UNIQUE NOT NULL
);

CREATE INDEX idx_ste_date       ON screen_time_events (date_local DESC);
CREATE INDEX idx_ste_bundle     ON screen_time_events (bundle_id);
CREATE INDEX idx_ste_start_time ON screen_time_events (start_time DESC);

ALTER TABLE screen_time_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read" ON screen_time_events
  FOR SELECT TO anon USING (true);
