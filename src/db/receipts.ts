import { getDb } from "../db"

export interface Receipt {
  id: string
  filename: string
  restaurant_name: string | null
  created_by: string | null
  processed_at: string | null
  processing_error: string | null
  total_cents: number | null
  tax_cents: number | null
  gratuity_cents: number | null
  created_at: string
  updated_at: string
}

export function createReceipt(id: string, filename: string, createdBy?: string | null): Receipt {
  const db = getDb()
  db.run("INSERT INTO receipts (id, filename, created_by) VALUES (?, ?, ?)", [
    id,
    filename,
    createdBy ?? null,
  ])
  return getReceipt(id)!
}

export function listReceiptsByCreator(sub: string): Receipt[] {
  const db = getDb()
  return db
    .query("SELECT * FROM receipts WHERE created_by = ? ORDER BY created_at DESC")
    .all(sub) as Receipt[]
}

export function getReceipt(id: string): Receipt | null {
  const db = getDb()
  return db.query("SELECT * FROM receipts WHERE id = ?").get(id) as Receipt | null
}

export function listReceipts(): Receipt[] {
  const db = getDb()
  return db.query("SELECT * FROM receipts ORDER BY created_at DESC").all() as Receipt[]
}

export interface ProcessedReceiptData {
  error?: string
  restaurant_name?: string | null
  total_cents?: number | null
  tax_cents?: number | null
  gratuity_cents?: number | null
}

export function updateReceiptTotals(
  id: string,
  totals: {
    total_cents: number | null
    tax_cents: number | null
    gratuity_cents: number | null
    restaurant_name?: string | null
  }
): void {
  const db = getDb()
  db.run(
    `UPDATE receipts
     SET total_cents = ?, tax_cents = ?, gratuity_cents = ?, restaurant_name = coalesce(?, restaurant_name), updated_at = datetime('now')
     WHERE id = ?`,
    [
      totals.total_cents,
      totals.tax_cents,
      totals.gratuity_cents,
      totals.restaurant_name ?? null,
      id,
    ]
  )
}

export function markReceiptProcessed(id: string, data: ProcessedReceiptData = {}): void {
  const db = getDb()
  db.run(
    `UPDATE receipts
     SET processed_at = datetime('now'),
         processing_error = ?,
         restaurant_name = ?,
         total_cents = ?,
         tax_cents = ?,
         gratuity_cents = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      data.error ?? null,
      data.restaurant_name ?? null,
      data.total_cents ?? null,
      data.tax_cents ?? null,
      data.gratuity_cents ?? null,
      id,
    ]
  )
}
