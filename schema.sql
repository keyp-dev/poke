DROP TABLE IF EXISTS webhooks;

CREATE TABLE webhooks (
  token TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  thread_id INTEGER,
  creator_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
