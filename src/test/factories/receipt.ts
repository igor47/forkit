import { copyFileSync } from "node:fs"
import { join } from "node:path"
import { config } from "@src/config"
import { createReceipt, type Receipt } from "@src/db/receipts"
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
