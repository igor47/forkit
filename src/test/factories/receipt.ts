import { copyFileSync } from "node:fs"
import { join } from "node:path"
import { config } from "@src/config"
import { createReceiptItems, type ReceiptItem } from "@src/db/receipt_items"
import { createReceipt, markReceiptProcessed, type Receipt } from "@src/db/receipts"
import { ulid } from "@src/lib/ids"

const TEST_FIXTURE = join(import.meta.dir, "..", "fixtures", "test-receipt.jpg")

/**
 * Create a receipt with a test image file on disk.
 */
export function createTestReceipt(overrides?: { id?: string; ext?: string }): Receipt {
  const id = overrides?.id ?? ulid()
  const ext = overrides?.ext ?? "jpg"
  const filename = `${id}.${ext}`

  // Copy test fixture to uploads dir
  copyFileSync(TEST_FIXTURE, join(config.uploadsPath, filename))

  // Insert into database
  return createReceipt(id, filename)
}

/**
 * Create a receipt with parsed items.
 */
export function createTestReceiptWithItems(
  items: { name: string; price_cents: number }[],
  totals?: { total_cents?: number; tax_cents?: number; gratuity_cents?: number }
): { receipt: Receipt; items: ReceiptItem[] } {
  const receipt = createTestReceipt()
  const createdItems = createReceiptItems(receipt.id, items)
  markReceiptProcessed(receipt.id, totals ?? {})
  return { receipt, items: createdItems }
}

/**
 * Create a receipt with a processing error.
 */
export function createTestReceiptWithError(error: string): Receipt {
  const receipt = createTestReceipt()
  markReceiptProcessed(receipt.id, { error })
  return receipt
}
