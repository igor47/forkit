import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { config } from "@src/config"
import { getReceiptItems } from "@src/db/receipt_items"
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

    test("displays parsed items with disabled checkboxes when no name", async () => {
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

      // Verify checkboxes exist but are disabled
      const checkboxes = doc.querySelectorAll("input[type='checkbox']")
      expect(checkboxes.length).toBe(2)
      expect((checkboxes[0] as HTMLInputElement).disabled).toBe(true)

      // Verify totals in footer
      const footer = doc.querySelector("table tfoot")!
      expect(footer.textContent).toContain("Tax")
      expect(footer.textContent).toContain("$2.01")
      expect(footer.textContent).toContain("Total")
      expect(footer.textContent).toContain("$22.99")
    })

    test("reads claimer name from query string", async () => {
      const { receipt, items } = createTestReceiptWithItems(
        [{ name: "Burger", price_cents: 1499 }],
        { total_cents: 1499 }
      )

      // Pre-claim the item
      const claimForm = new FormData()
      claimForm.append("claimer_name", "Alice")
      claimForm.append("previous_name", "Alice")
      claimForm.append(`item-${items[0]!.id}`, "on")
      await makeRequest(testCtx.app, `/receipts/${receipt.id}/claim`, {
        method: "POST",
        body: claimForm,
      })

      // Load page with name in URL
      const response = await makeRequest(testCtx.app, `/receipts/${receipt.id}?name=Alice`)
      expect(response.status).toBe(200)
      const doc = await parseHtml(response)

      // Checkbox should be checked and enabled
      const checkbox = doc.querySelector("input[type='checkbox'][checked]")
      expect(checkbox).not.toBeNull()
      expect((checkbox as HTMLInputElement).disabled).toBe(false)
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

  describe("POST /receipts/:id/claim", () => {
    test("claims an item when checkbox is checked", async () => {
      const { receipt, items } = createTestReceiptWithItems(
        [
          { name: "Burger", price_cents: 1499 },
          { name: "Fries", price_cents: 599 },
        ],
        { total_cents: 2299, tax_cents: 201 }
      )

      const formData = new FormData()
      formData.append("claimer_name", "Alice")
      formData.append("previous_name", "Alice")
      formData.append(`item-${items[0]!.id}`, "on")

      const response = await makeRequest(testCtx.app, `/receipts/${receipt.id}/claim`, {
        method: "POST",
        body: formData,
      })

      expect(response.status).toBe(200)

      // Verify item is claimed in DB
      const updatedItems = getReceiptItems(receipt.id)
      expect(updatedItems[0]!.claimed_by).toBe("Alice")
      expect(updatedItems[1]!.claimed_by).toBeNull()
    })

    test("unclaims an item when checkbox is unchecked", async () => {
      const { receipt, items } = createTestReceiptWithItems(
        [{ name: "Burger", price_cents: 1499 }],
        { total_cents: 1499 }
      )

      // First claim it
      const claimForm = new FormData()
      claimForm.append("claimer_name", "Alice")
      claimForm.append("previous_name", "Alice")
      claimForm.append(`item-${items[0]!.id}`, "on")
      await makeRequest(testCtx.app, `/receipts/${receipt.id}/claim`, {
        method: "POST",
        body: claimForm,
      })

      // Then unclaim (submit without checkbox)
      const unclaimForm = new FormData()
      unclaimForm.append("claimer_name", "Alice")
      unclaimForm.append("previous_name", "Alice")
      await makeRequest(testCtx.app, `/receipts/${receipt.id}/claim`, {
        method: "POST",
        body: unclaimForm,
      })

      const updatedItems = getReceiptItems(receipt.id)
      expect(updatedItems[0]!.claimed_by).toBeNull()
    })

    test("renders person's share with tax and tip", async () => {
      const { receipt, items } = createTestReceiptWithItems(
        [
          { name: "Burger", price_cents: 1000 },
          { name: "Salad", price_cents: 1000 },
        ],
        { total_cents: 2400, tax_cents: 200, gratuity_cents: 200 }
      )

      // Claim one of two equal items (50% share)
      const formData = new FormData()
      formData.append("claimer_name", "Bob")
      formData.append("previous_name", "Bob")
      formData.append(`item-${items[0]!.id}`, "on")

      const response = await makeRequest(testCtx.app, `/receipts/${receipt.id}/claim`, {
        method: "POST",
        body: formData,
      })

      expect(response.status).toBe(200)
      const doc = await parseHtml(response)

      const shareCard = expectElement(doc, ".card")
      expect(shareCard.textContent).toContain("Bob's Share")
      expect(shareCard.textContent).toContain("$10.00") // items subtotal
      expect(shareCard.textContent).toContain("$1.00") // tax portion (50% of $2)
    })

    test("shows other claimers' names on their items", async () => {
      const { receipt, items } = createTestReceiptWithItems(
        [
          { name: "Burger", price_cents: 1499 },
          { name: "Salad", price_cents: 899 },
        ],
        { total_cents: 2599, tax_cents: 201 }
      )

      // Alice claims the burger
      const aliceForm = new FormData()
      aliceForm.append("claimer_name", "Alice")
      aliceForm.append("previous_name", "Alice")
      aliceForm.append(`item-${items[0]!.id}`, "on")
      await makeRequest(testCtx.app, `/receipts/${receipt.id}/claim`, {
        method: "POST",
        body: aliceForm,
      })

      // Bob views - should see Alice's name on the burger
      const bobForm = new FormData()
      bobForm.append("claimer_name", "Bob")
      const response = await makeRequest(testCtx.app, `/receipts/${receipt.id}/claim`, {
        method: "POST",
        body: bobForm,
      })

      const doc = await parseHtml(response)
      const rows = doc.querySelectorAll("table tbody tr")
      expect(rows[0]!.textContent).toContain("Alice")
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
