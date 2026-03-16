import { join } from "node:path"
import { ReceiptView } from "@src/components/ReceiptView"
import { UploadForm } from "@src/components/UploadForm"
import { config } from "@src/config"
import { createReceipt, getReceipt } from "@src/db/receipts"
import { ulid } from "@src/lib/ids"
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

  c.header("HX-Redirect", `/receipts/${id}`)
  return c.body(null, 204)
})

receiptsRoutes.get("/receipts/:id", (c) => {
  const receipt = getReceipt(c.req.param("id"))
  if (!receipt) {
    return c.text("Receipt not found", 404)
  }

  return c.render(
    <div class="container mt-4">
      <ReceiptView receipt={receipt} />
    </div>,
    { title: "Receipt" }
  )
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
