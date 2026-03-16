import { getDb } from "../db"

export interface Receipt {
  id: string
  filename: string
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
