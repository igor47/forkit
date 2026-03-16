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

      // Extract receipt ID from redirect URL (format: /receipts/{id}/edit)
      const id = redirect!.split("/receipts/")[1]!.split("/")[0]!

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

  describe("GET /receipts/:id/edit", () => {
    test("returns edit form with current items", async () => {
      const { receipt } = createTestReceiptWithItems(
        [
          { name: "Burger", price_cents: 1499 },
          { name: "Fries", price_cents: 599 },
        ],
        { total_cents: 2299, tax_cents: 201, gratuity_cents: 300 }
      )

      const response = await makeRequest(testCtx.app, `/receipts/${receipt.id}/edit`)
      expect(response.status).toBe(200)
      const doc = await parseHtml(response)

      const nameInputs = doc.querySelectorAll("input[name^='name-']")
      expect(nameInputs.length).toBe(2)
      expect((nameInputs[0] as HTMLInputElement).value).toBe("Burger")

      const gratuityInput = doc.querySelector("input[name='gratuity']") as HTMLInputElement
      expect(gratuityInput.value).toBe("3.00")
    })
  })

  describe("POST /receipts/:id/edit", () => {
    test("saves updated items and totals", async () => {
      const { receipt } = createTestReceiptWithItems([{ name: "Burger", price_cents: 1499 }], {
        total_cents: 1499,
      })

      const formData = new FormData()
      formData.append("name-0", "Cheeseburger")
      formData.append("price-0", "15.99")
      formData.append("item_count", "1")
      formData.append("tax", "1.28")
      formData.append("gratuity", "3.00")

      const response = await makeRequest(testCtx.app, `/receipts/${receipt.id}/edit`, {
        method: "POST",
        body: formData,
      })

      expect(response.status).toBe(200)

      // Verify items updated
      const items = getReceiptItems(receipt.id)
      expect(items.length).toBe(1)
      expect(items[0]!.name).toBe("Cheeseburger")
      expect(items[0]!.price_cents).toBe(1599)

      // Verify tax/gratuity updated, total preserved from LLM
      const updated = getReceipt(receipt.id)!
      expect(updated.gratuity_cents).toBe(300)
      expect(updated.tax_cents).toBe(128)
      expect(updated.total_cents).toBe(1499) // original LLM total preserved
    })

    test("removes item via remove_item action", async () => {
      const { receipt } = createTestReceiptWithItems(
        [
          { name: "Burger", price_cents: 1499 },
          { name: "Fries", price_cents: 599 },
        ],
        { total_cents: 2098 }
      )

      // First remove burger (index 0) — re-renders form without saving
      const removeForm = new FormData()
      removeForm.append("name-0", "Burger")
      removeForm.append("price-0", "14.99")
      removeForm.append("name-1", "Fries")
      removeForm.append("price-1", "5.99")
      removeForm.append("item_count", "2")
      removeForm.append("action", "remove_item")
      removeForm.append("remove_index", "0")
      removeForm.append("tax", "")
      removeForm.append("gratuity", "")

      const response = await makeRequest(testCtx.app, `/receipts/${receipt.id}/edit`, {
        method: "POST",
        body: removeForm,
      })

      // Should re-render with only Fries
      const doc = await parseHtml(response)
      const nameInputs = doc.querySelectorAll("input[name^='name-']")
      expect(nameInputs.length).toBe(1)
      expect((nameInputs[0] as HTMLInputElement).value).toBe("Fries")

      // Now save
      const saveForm = new FormData()
      saveForm.append("name-0", "Fries")
      saveForm.append("price-0", "5.99")
      saveForm.append("item_count", "1")
      saveForm.append("tax", "")
      saveForm.append("gratuity", "")

      await makeRequest(testCtx.app, `/receipts/${receipt.id}/edit`, {
        method: "POST",
        body: saveForm,
      })

      const items = getReceiptItems(receipt.id)
      expect(items.length).toBe(1)
      expect(items[0]!.name).toBe("Fries")
    })

    test("add_item re-renders form with extra row", async () => {
      const { receipt } = createTestReceiptWithItems([{ name: "Burger", price_cents: 1499 }], {
        total_cents: 1499,
      })

      const formData = new FormData()
      formData.append("name-0", "Burger")
      formData.append("price-0", "14.99")
      formData.append("item_count", "1")
      formData.append("action", "add_item")
      formData.append("tax", "")
      formData.append("gratuity", "")

      const response = await makeRequest(testCtx.app, `/receipts/${receipt.id}/edit`, {
        method: "POST",
        body: formData,
      })

      expect(response.status).toBe(200)
      const doc = await parseHtml(response)

      // Should have 2 rows now (1 existing + 1 new blank)
      const nameInputs = doc.querySelectorAll("input[name^='name-']")
      expect(nameInputs.length).toBe(2)
    })
  })

  describe("split items", () => {
    test("prompt_split shows split UI for the correct row", async () => {
      const { receipt } = createTestReceiptWithItems(
        [{ name: "2 Green Salad", price_cents: 2400 }],
        { total_cents: 2400 }
      )

      const formData = new FormData()
      formData.append("name-0", "2 Green Salad")
      formData.append("price-0", "24.00")
      formData.append("item_count", "1")
      formData.append("action", "prompt_split")
      formData.append("split_index", "0")
      formData.append("tax", "")
      formData.append("gratuity", "")

      const response = await makeRequest(testCtx.app, `/receipts/${receipt.id}/edit`, {
        method: "POST",
        body: formData,
      })

      expect(response.status).toBe(200)
      const doc = await parseHtml(response)

      // Should show a split_count input
      const splitInput = doc.querySelector("input[name='split_count']") as HTMLInputElement
      expect(splitInput).not.toBeNull()
      expect(splitInput.value).toBe("2")
    })

    test("split_item divides evenly into N rows", async () => {
      const { receipt } = createTestReceiptWithItems(
        [{ name: "3 Green Salad", price_cents: 2100 }],
        { total_cents: 2100 }
      )

      const formData = new FormData()
      formData.append("name-0", "3 Green Salad")
      formData.append("price-0", "21.00")
      formData.append("item_count", "1")
      formData.append("action", "split_item")
      formData.append("split_index", "0")
      formData.append("split_count", "3")
      formData.append("tax", "")
      formData.append("gratuity", "")

      const response = await makeRequest(testCtx.app, `/receipts/${receipt.id}/edit`, {
        method: "POST",
        body: formData,
      })

      expect(response.status).toBe(200)
      const doc = await parseHtml(response)

      const nameInputs = doc.querySelectorAll("input[name^='name-']")
      expect(nameInputs.length).toBe(3)

      const priceInputs = doc.querySelectorAll("input[name^='price-']")
      expect((priceInputs[0] as HTMLInputElement).value).toBe("7.00")
      expect((priceInputs[1] as HTMLInputElement).value).toBe("7.00")
      expect((priceInputs[2] as HTMLInputElement).value).toBe("7.00")
    })

    test("split_item puts remainder cents on first row", async () => {
      const { receipt } = createTestReceiptWithItems([{ name: "Appetizer", price_cents: 2101 }], {
        total_cents: 2101,
      })

      const formData = new FormData()
      formData.append("name-0", "Appetizer")
      formData.append("price-0", "21.01")
      formData.append("item_count", "1")
      formData.append("action", "split_item")
      formData.append("split_index", "0")
      formData.append("split_count", "3")
      formData.append("tax", "")
      formData.append("gratuity", "")

      const response = await makeRequest(testCtx.app, `/receipts/${receipt.id}/edit`, {
        method: "POST",
        body: formData,
      })

      expect(response.status).toBe(200)
      const doc = await parseHtml(response)

      const priceInputs = doc.querySelectorAll("input[name^='price-']")
      expect((priceInputs[0] as HTMLInputElement).value).toBe("7.01")
      expect((priceInputs[1] as HTMLInputElement).value).toBe("7.00")
      expect((priceInputs[2] as HTMLInputElement).value).toBe("7.00")
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
