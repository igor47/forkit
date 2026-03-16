CREATE TABLE receipts (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
