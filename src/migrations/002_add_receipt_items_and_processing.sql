ALTER TABLE receipts ADD COLUMN processed_at TEXT;
ALTER TABLE receipts ADD COLUMN processing_error TEXT;
ALTER TABLE receipts ADD COLUMN total_cents INTEGER;
ALTER TABLE receipts ADD COLUMN tax_cents INTEGER;
ALTER TABLE receipts ADD COLUMN gratuity_cents INTEGER;

CREATE TABLE receipt_items (
  id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL REFERENCES receipts(id),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
