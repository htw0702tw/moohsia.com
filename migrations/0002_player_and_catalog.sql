-- Personal player record for the team site owner.
-- Public pages read published_json only. The row stays empty until
-- admin or a Notion sync writes it, and until that draft is published.
-- Do not put passwords, session secrets, or Discord invites here.

CREATE TABLE IF NOT EXISTS player_records (
  id TEXT PRIMARY KEY,
  draft_json TEXT NOT NULL,
  published_json TEXT,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

-- Official Arena of Valor hero and mode catalog.
-- Refreshed by `npm run catalog:refresh` (git snapshot) and by the Worker
-- cron / admin button into this table and CMS_KV.

CREATE TABLE IF NOT EXISTS aov_catalog (
  id TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  source TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
