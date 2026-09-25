-- Recruitment applications for moohsia-com.
-- Invite URLs are not stored. approval keeps only a hash so a pasted
-- one-time link cannot be reused from this database.
-- Do not put Discord invite URLs, passwords, or mail API keys here.

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  email TEXT NOT NULL,
  uid TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  reviewed_at TEXT,
  decision_note TEXT,
  invite_hash TEXT
);

CREATE INDEX IF NOT EXISTS applications_status ON applications (status, created_at);
CREATE INDEX IF NOT EXISTS applications_uid ON applications (uid, status);
