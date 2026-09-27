-- Permanent Arena of Valor match archive.
-- Every import writes an immutable version row first. The canonical row only
-- moves forward when the incoming record is at least as complete as the stored one.
-- This is intentionally separate from the CMS JSON, whose recent-match list is capped.

CREATE TABLE IF NOT EXISTS aov_imports (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL,
  match_count INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS aov_match_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  import_id TEXT NOT NULL,
  match_key TEXT NOT NULL,
  source TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  external_match_id TEXT NOT NULL DEFAULT '',
  played_at TEXT NOT NULL DEFAULT '',
  hero TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  richness INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL,
  FOREIGN KEY(import_id) REFERENCES aov_imports(id)
);

CREATE INDEX IF NOT EXISTS aov_match_versions_key
  ON aov_match_versions(match_key, captured_at DESC);
CREATE INDEX IF NOT EXISTS aov_match_versions_import
  ON aov_match_versions(import_id);

CREATE TABLE IF NOT EXISTS aov_canonical_matches (
  match_key TEXT PRIMARY KEY,
  external_match_id TEXT NOT NULL DEFAULT '',
  played_at TEXT NOT NULL DEFAULT '',
  hero TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL,
  richness INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS aov_canonical_played
  ON aov_canonical_matches(played_at DESC);
