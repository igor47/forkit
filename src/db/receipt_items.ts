import { getDb } from "../db"
import { ulid } from "../lib/ids"

export interface ReceiptItem {
  id: string
  receipt_id: string
  name: string
  price_cents: number
  claimed_by: string | null
  created_at: string
}

export function createReceiptItems(
  receiptId: string,
  items: { name: string; price_cents: number }[]
): ReceiptItem[] {
  const db = getDb()
  const stmt = db.prepare(
    "INSERT INTO receipt_items (id, receipt_id, name, price_cents) VALUES (?, ?, ?, ?)"
  )

  for (const item of items) {
    stmt.run(ulid(), receiptId, item.name, item.price_cents)
  }

  return getReceiptItems(receiptId)
}

export function getReceiptItems(receiptId: string): ReceiptItem[] {
  const db = getDb()
  return db
    .query("SELECT * FROM receipt_items WHERE receipt_id = ? ORDER BY created_at")
    .all(receiptId) as ReceiptItem[]
}

export function claimReceiptItem(itemId: string, claimedBy: string | null): void {
  const db = getDb()
  db.run("UPDATE receipt_items SET claimed_by = ? WHERE id = ?", [claimedBy, itemId])
}

export function deleteReceiptItems(receiptId: string): void {
  const db = getDb()
  db.run("DELETE FROM receipt_items WHERE receipt_id = ?", [receiptId])
}
