CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, r2_key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, size INTEGER NOT NULL, mime TEXT, created_at INTEGER NOT NULL, owner TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS files_owner_created ON files(owner, created_at DESC);
CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY, r2_upload_id TEXT NOT NULL, r2_key TEXT NOT NULL, name TEXT NOT NULL, size INTEGER NOT NULL, mime TEXT, owner TEXT NOT NULL, created_at INTEGER NOT NULL, share_id TEXT);
CREATE TABLE IF NOT EXISTS shares (id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, purpose TEXT NOT NULL, file_id TEXT, expires_at INTEGER NOT NULL, max_bytes INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS shares_token_expiry ON shares(token, expires_at);
