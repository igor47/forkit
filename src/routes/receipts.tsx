import { join } from "node:path"
import { ReceiptClaim } from "@src/components/ReceiptClaim"
import { ReceiptEdit } from "@src/components/ReceiptEdit"
import { ReceiptView } from "@src/components/ReceiptView"
import { UploadForm } from "@src/components/UploadForm"
import { config } from "@src/config"
import {
  claimReceiptItem,
  createReceiptItems,
  deleteReceiptItems,
  getReceiptItems,
} from "@src/db/receipt_items"
import {
  createReceipt,
  getReceipt,
  markReceiptProcessed,
  updateReceiptTotals,
} from "@src/db/receipts"
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

receiptsRoutes.get("/receipts/:id/edit", (c) => {
  const receipt = getReceipt(c.req.param("id"))
  if (!receipt) {
    return c.text("Receipt not found", 404)
  }

  const items = getReceiptItems(receipt.id)
  return c.html(<ReceiptEdit receipt={receipt} items={items} />)
})

receiptsRoutes.get("/receipts/:id/claim-form", (c) => {
  const receipt = getReceipt(c.req.param("id"))
  if (!receipt) {
    return c.text("Receipt not found", 404)
  }

  const items = getReceiptItems(receipt.id)
  const claimerName = c.req.query("name") ?? ""
  return c.html(<ReceiptClaim receipt={receipt} items={items} claimerName={claimerName} />)
})

function dollarsToCents(value: string): number | null {
  if (!value || value.trim() === "") return null
  const parsed = Number.parseFloat(value)
  if (Number.isNaN(parsed)) return null
  return Math.round(parsed * 100)
}

receiptsRoutes.post("/receipts/:id/edit", async (c) => {
  const receipt = getReceipt(c.req.param("id"))
  if (!receipt) {
    return c.text("Receipt not found", 404)
  }

  const formData = await c.req.formData()
  const action = formData.get("action") as string | null
  const itemCount = parseInt((formData.get("item_count") as string) || "0", 10)

  // Collect current form items
  const removeIndex =
    action === "remove_item" ? parseInt((formData.get("remove_index") as string) || "-1", 10) : -1
  const formItems: { name: string; price_cents: number }[] = []
  for (let i = 0; i < itemCount; i++) {
    if (i === removeIndex) continue
    const name = (formData.get(`name-${i}`) as string) ?? ""
    const price = (formData.get(`price-${i}`) as string) ?? ""
    if (name.trim()) {
      formItems.push({ name: name.trim(), price_cents: dollarsToCents(price) ?? 0 })
    }
  }

  if (action === "add_item" || action === "remove_item") {
    // Re-render form with updated item list
    const pseudoItems = formItems.map((item, i) => ({
      id: `form-${i}`,
      receipt_id: receipt.id,
      name: item.name,
      price_cents: item.price_cents,
      claimed_by: null,
      created_at: "",
    }))

    // Preserve totals from form
    const editReceipt = {
      ...receipt,
      tax_cents: dollarsToCents((formData.get("tax") as string) ?? ""),
      gratuity_cents: dollarsToCents((formData.get("gratuity") as string) ?? ""),
    }

    const extraRows = action === "add_item" ? 1 : 0
    return c.html(<ReceiptEdit receipt={editReceipt} items={pseudoItems} extraRows={extraRows} />)
  }

  // Save: delete old items and re-insert
  deleteReceiptItems(receipt.id)
  if (formItems.length > 0) {
    createReceiptItems(receipt.id, formItems)
  }

  // Update tax and gratuity (total is always computed)
  updateReceiptTotals(receipt.id, {
    total_cents: receipt.total_cents, // preserve original LLM-extracted total
    tax_cents: dollarsToCents((formData.get("tax") as string) ?? ""),
    gratuity_cents: dollarsToCents((formData.get("gratuity") as string) ?? ""),
  })

  // Return to claim mode
  const updatedReceipt = getReceipt(receipt.id)!
  const updatedItems = getReceiptItems(receipt.id)
  return c.html(<ReceiptClaim receipt={updatedReceipt} items={updatedItems} claimerName="" />)
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
