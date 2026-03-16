import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { config } from "@src/config"
import { getReceipt } from "@src/db/receipts"
import { useTestApp } from "@src/test/app"
import {
  createTestReceipt,
  createTestReceiptWithError,
  createTestReceiptWithItems,
} from "@src/test/factories/receipt"
import { expectElement, makeRequest, parseHtml } from "@src/test/http"

describe("receipts", () => {
  const testCtx = useTestApp()

  describe("POST /receipts/upload", () => {
    test("uploads a photo and redirects to receipt page", async () => {
      const file = Bun.file("src/test/fixtures/test-receipt.jpg")
      const formData = new FormData()
      formData.append(
        "photo",
        new File([await file.bytes()], "receipt.jpg", { type: "image/jpeg" })
      )

      const response = await makeRequest(testCtx.app, "/receipts/upload", {
        method: "POST",
        body: formData,
      })

      expect(response.status).toBe(204)
      const redirect = response.headers.get("HX-Redirect")
      expect(redirect).toMatch(/^\/receipts\//)

      // Extract receipt ID from redirect URL
      const id = redirect!.split("/receipts/")[1]!

      // Verify file exists on disk
      const receipt = getReceipt(id)
      expect(receipt).not.toBeNull()
      expect(existsSync(join(config.uploadsPath, receipt!.filename))).toBe(true)
    })

    test("returns error when no file is provided", async () => {
      const formData = new FormData()

      const response = await makeRequest(testCtx.app, "/receipts/upload", {
        method: "POST",
        body: formData,
      })

      expect(response.status).toBe(200)
      const doc = await parseHtml(response)
      const alert = expectElement(doc, ".alert-danger")
      expect(alert.textContent).toContain("Please select a photo")
    })
  })

  describe("GET /receipts/:id", () => {
    test("displays the receipt with a thumbnail", async () => {
      const receipt = createTestReceipt()

      const response = await makeRequest(testCtx.app, `/receipts/${receipt.id}`)

      expect(response.status).toBe(200)
      const doc = await parseHtml(response)

      const img = expectElement(doc, "img.receipt-thumbnail")
      expect(img.getAttribute("src")).toBe(`/uploads/${receipt.filename}`)

      const link = expectElement(doc, "a[target='_blank']")
      expect(link.getAttribute("href")).toBe(`/uploads/${receipt.filename}`)
    })

    test("displays parsed items in a table", async () => {
      const { receipt } = createTestReceiptWithItems(
        [
          { name: "Burger", price_cents: 1499 },
          { name: "Fries", price_cents: 599 },
        ],
        { total_cents: 2299, tax_cents: 201 }
      )

      const response = await makeRequest(testCtx.app, `/receipts/${receipt.id}`)

      expect(response.status).toBe(200)
      const doc = await parseHtml(response)

      // Verify items are rendered
      const rows = doc.querySelectorAll("table tbody tr")
      expect(rows.length).toBe(2)
      expect(rows[0]!.textContent).toContain("Burger")
      expect(rows[0]!.textContent).toContain("$14.99")
      expect(rows[1]!.textContent).toContain("Fries")
      expect(rows[1]!.textContent).toContain("$5.99")

      // Verify totals in footer
      const footer = doc.querySelector("table tfoot")!
      expect(footer.textContent).toContain("Tax")
      expect(footer.textContent).toContain("$2.01")
      expect(footer.textContent).toContain("Total")
      expect(footer.textContent).toContain("$22.99")
    })

    test("displays processing error with try again button", async () => {
      const receipt = createTestReceiptWithError("This does not appear to be a restaurant receipt")

      const response = await makeRequest(testCtx.app, `/receipts/${receipt.id}`)

      expect(response.status).toBe(200)
      const doc = await parseHtml(response)

      const alert = expectElement(doc, ".alert-danger")
      expect(alert.textContent).toContain("does not appear to be a restaurant receipt")

      const tryAgain = expectElement(doc, ".alert-danger a.btn")
      expect(tryAgain.getAttribute("href")).toBe("/")
      expect(tryAgain.textContent).toContain("Try Again")
    })

    test("returns 404 for unknown receipt", async () => {
      const response = await makeRequest(testCtx.app, "/receipts/nonexistent")
      expect(response.status).toBe(404)
    })
  })

  describe("GET /uploads/:filename", () => {
    test("serves the uploaded file", async () => {
      const receipt = createTestReceipt()

      const response = await makeRequest(testCtx.app, `/uploads/${receipt.filename}`)

      expect(response.status).toBe(200)
      expect(response.headers.get("Content-Type")).toBe("image/jpeg")
    })

    test("returns 404 for missing file", async () => {
      const response = await makeRequest(testCtx.app, "/uploads/nonexistent.jpg")
      expect(response.status).toBe(404)
    })
  })
})
