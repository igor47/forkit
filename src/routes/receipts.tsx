import { join } from "node:path"
import { ReceiptClaim } from "@src/components/ReceiptClaim"
import { ReceiptView } from "@src/components/ReceiptView"
import { UploadForm } from "@src/components/UploadForm"
import { config } from "@src/config"
import { claimReceiptItem, getReceiptItems } from "@src/db/receipt_items"
import { createReceipt, getReceipt, markReceiptProcessed } from "@src/db/receipts"
import { ulid } from "@src/lib/ids"
import { logger } from "@src/lib/logger"
import { Hono } from "hono"
import { getMimeType } from "hono/utils/mime"

export const receiptsRoutes = new Hono()

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  }
  return map[mime] ?? "jpg"
}

receiptsRoutes.post("/receipts/upload", async (c) => {
  const formData = await c.req.formData()
  const photo = formData.get("photo")

  if (!photo || !(photo instanceof File) || photo.size === 0) {
    return c.html(<UploadForm error="Please select a photo to upload." />)
  }

  if (!ALLOWED_TYPES.has(photo.type)) {
    return c.html(<UploadForm error="Please upload an image file (JPEG, PNG, or WebP)." />)
  }

  const id = ulid()
  const ext = extFromMime(photo.type)
  const filename = `${id}.${ext}`
  const filepath = join(config.uploadsPath, filename)

  await Bun.write(filepath, photo)
  createReceipt(id, filename)

  // Parse receipt via AI
  if (!config.anthropicApiKey) {
    markReceiptProcessed(id, { error: "ANTHROPIC_API_KEY is not configured" })
  } else {
    try {
      // Dynamic import to avoid loading the SDK when not configured
      const { parseReceipt } = await import("@src/lib/parse-receipt")
      const result = await parseReceipt(filepath)

      if (result.error) {
        markReceiptProcessed(id, { error: result.error })
      } else {
        const { createReceiptItems } = await import("@src/db/receipt_items")
        createReceiptItems(id, result.items)
        markReceiptProcessed(id, {
          total_cents: result.total_cents,
          tax_cents: result.tax_cents,
          gratuity_cents: result.gratuity_cents,
        })
      }
    } catch (e) {
      logger.error("Receipt parsing failed", e as Error, { receiptId: id })
      markReceiptProcessed(id, { error: "Receipt parsing failed unexpectedly" })
    }
  }

  c.header("HX-Redirect", `/receipts/${id}`)
  return c.body(null, 204)
})

receiptsRoutes.get("/receipts/:id", (c) => {
  const receipt = getReceipt(c.req.param("id"))
  if (!receipt) {
    return c.text("Receipt not found", 404)
  }

  const items = getReceiptItems(receipt.id)
  const claimerName = c.req.query("name") ?? ""

  return c.render(
    <div class="container mt-4">
      <ReceiptView receipt={receipt} items={items} claimerName={claimerName} />
    </div>,
    { title: "Receipt" }
  )
})

receiptsRoutes.post("/receipts/:id/claim", async (c) => {
  const receipt = getReceipt(c.req.param("id"))
  if (!receipt) {
    return c.text("Receipt not found", 404)
  }

  const formData = await c.req.formData()
  const claimerName = (formData.get("claimer_name") as string) ?? ""
  const previousName = (formData.get("previous_name") as string) ?? ""
  const nameChanged = claimerName.trim() !== previousName.trim()
  const items = getReceiptItems(receipt.id)

  // Only process checkbox state when the name hasn't changed
  // When name changes, it's a new person — don't re-claim previous person's items
  if (claimerName.trim() && !nameChanged) {
    for (const item of items) {
      const checked = formData.get(`item-${item.id}`) === "on"
      if (checked && item.claimed_by !== claimerName) {
        claimReceiptItem(item.id, claimerName)
      } else if (!checked && item.claimed_by === claimerName) {
        claimReceiptItem(item.id, null)
      }
    }
  }

  // Re-fetch items after updates
  const updatedItems = getReceiptItems(receipt.id)

  // Push name into URL so refresh preserves state
  const nameParam = claimerName.trim() ? `?name=${encodeURIComponent(claimerName.trim())}` : ""
  c.header("HX-Push-Url", `/receipts/${receipt.id}${nameParam}`)

  return c.html(<ReceiptClaim receipt={receipt} items={updatedItems} claimerName={claimerName} />)
})

receiptsRoutes.get("/uploads/:filename", async (c) => {
  const filename = c.req.param("filename")

  // Prevent directory traversal
  if (filename.includes("..") || filename.includes("/")) {
    return c.text("Not found", 404)
  }

  const filepath = join(config.uploadsPath, filename)
  const file = Bun.file(filepath)

  if (!(await file.exists())) {
    return c.text("Not found", 404)
  }

  const mimeType = getMimeType(filename) || "application/octet-stream"
  c.header("Content-Type", mimeType)
  c.header("Content-Length", file.size.toString())
  return c.body(await file.bytes())
})
