-- CMS documents for moohsia-com.
-- The Worker seeds this table from the built-in site defaults in src/content.js
-- when the `site` row is missing. Do not put passwords or session secrets here.

CREATE TABLE IF NOT EXISTS site_documents (
  id TEXT PRIMARY KEY,
  draft_json TEXT NOT NULL,
  published_json TEXT,
  updated_at TEXT NOT NULL,
  published_at TEXT
);
