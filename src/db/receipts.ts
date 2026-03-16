import { getDb } from "../db"

export interface Receipt {
  id: string
  filename: string
  processed_at: string | null
  processing_error: string | null
  total_cents: number | null
  tax_cents: number | null
  gratuity_cents: number | null
  created_at: string
  updated_at: string
}

export function createReceipt(id: string, filename: string): Receipt {
  const db = getDb()
  db.run("INSERT INTO receipts (id, filename) VALUES (?, ?)", [id, filename])
  return getReceipt(id)!
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
  total_cents?: number | null
  tax_cents?: number | null
  gratuity_cents?: number | null
}

export function updateReceiptTotals(
  id: string,
  totals: { total_cents: number | null; tax_cents: number | null; gratuity_cents: number | null }
): void {
  const db = getDb()
  db.run(
    `UPDATE receipts
     SET total_cents = ?, tax_cents = ?, gratuity_cents = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [totals.total_cents, totals.tax_cents, totals.gratuity_cents, id]
  )
}

export function markReceiptProcessed(id: string, data: ProcessedReceiptData = {}): void {
  const db = getDb()
  db.run(
    `UPDATE receipts
     SET processed_at = datetime('now'),
         processing_error = ?,
         total_cents = ?,
         tax_cents = ?,
         gratuity_cents = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [
      data.error ?? null,
      data.total_cents ?? null,
      data.tax_cents ?? null,
      data.gratuity_cents ?? null,
      id,
    ]
  )
}
