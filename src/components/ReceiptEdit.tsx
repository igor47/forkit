import type { ReceiptItem } from "@src/db/receipt_items"
import type { Receipt } from "@src/db/receipts"

export interface ReceiptEditProps {
  receipt: Receipt
  items: ReceiptItem[]
  extraRows?: number
  splitIndex?: number | null
  claimerName?: string
}

function centsToDollars(cents: number | null): string {
  if (cents == null) return ""
  return (cents / 100).toFixed(2)
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export const ReceiptEdit = ({
  receipt,
  items,
  extraRows = 0,
  splitIndex = null,
  claimerName = "",
}: ReceiptEditProps) => {
  const itemsTotal = items.reduce((sum, i) => sum + i.price_cents, 0)
  const computedTotal = itemsTotal + (receipt.tax_cents ?? 0) + (receipt.gratuity_cents ?? 0)

  // Check for mismatch between LLM-extracted total and computed total
  // Ignore if the difference equals the gratuity (receipt didn't include tip)
  const originalTotal = receipt.total_cents
  let showMismatchWarning = false
  if (originalTotal != null && originalTotal !== computedTotal) {
    const diff = Math.abs(originalTotal - computedTotal)
    const gratuity = receipt.gratuity_cents ?? 0
    if (diff !== gratuity) {
      showMismatchWarning = true
    }
  }

  return (
    <div id="receipt-content">
      <form
        hx-post={`/receipts/${receipt.id}/edit`}
        hx-target="#receipt-content"
        hx-swap="innerHTML"
      >
        <input type="hidden" name="claimer_name" value={claimerName} />
        <h5>Edit Items</h5>

        <table class="table table-sm">
          <thead>
            <tr>
              <th>Item</th>
              <th style="width: 120px;">Price</th>
              <th style="width: 80px;"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) =>
              i === splitIndex ? (
                <tr key={item.id}>
                  <td>
                    <span class="form-control-plaintext form-control-sm">{item.name}</span>
                    <input type="hidden" name={`name-${i}`} value={item.name} />
                    <input type="hidden" name={`claimed-by-${i}`} value={item.claimed_by ?? ""} />
                  </td>
                  <td>
                    <span class="form-control-plaintext form-control-sm text-end">
                      {formatDollars(item.price_cents)}
                    </span>
                    <input
                      type="hidden"
                      name={`price-${i}`}
                      value={centsToDollars(item.price_cents)}
                    />
                  </td>
                  <td>
                    <div class="d-flex align-items-center gap-1">
                      <input
                        type="number"
                        class="form-control form-control-sm"
                        name="split_count"
                        value="2"
                        min="2"
                        max="20"
                        style="width: 60px;"
                      />
                      <button
                        type="button"
                        class="btn btn-sm btn-primary"
                        hx-post={`/receipts/${receipt.id}/edit`}
                        hx-target="#receipt-content"
                        hx-swap="innerHTML"
                        hx-include="closest form"
                        hx-vals={`{"action": "split_item", "split_index": "${i}"}`}
                        title="Split"
                      >
                        Split
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary"
                        hx-post={`/receipts/${receipt.id}/edit`}
                        hx-target="#receipt-content"
                        hx-swap="innerHTML"
                        hx-include="closest form"
                        hx-vals='{"action": "cancel_split"}'
                        title="Cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={item.id}>
                  <td>
                    <input type="hidden" name={`claimed-by-${i}`} value={item.claimed_by ?? ""} />
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      name={`name-${i}`}
                      value={item.name}
                    />
                  </td>
                  <td>
                    <div class="input-group input-group-sm">
                      <span class="input-group-text">$</span>
                      <input
                        type="number"
                        class="form-control form-control-sm"
                        name={`price-${i}`}
                        value={centsToDollars(item.price_cents)}
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </td>
                  <td>
                    <div class="d-flex gap-1">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-secondary border-0"
                        hx-post={`/receipts/${receipt.id}/edit`}
                        hx-target="#receipt-content"
                        hx-swap="innerHTML"
                        hx-include="closest form"
                        hx-vals={`{"action": "prompt_split", "split_index": "${i}"}`}
                        title="Split item"
                      >
                        &divide;
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger border-0"
                        hx-post={`/receipts/${receipt.id}/edit`}
                        hx-target="#receipt-content"
                        hx-swap="innerHTML"
                        hx-include="closest form"
                        hx-vals={`{"action": "remove_item", "remove_index": "${i}"}`}
                        title="Remove item"
                      >
                        &times;
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
            {Array.from({ length: extraRows }).map((_, j) => {
              const idx = items.length + j
              return (
                <tr key={`new-${idx}`}>
                  <td>
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      name={`name-${idx}`}
                      placeholder="New item"
                    />
                  </td>
                  <td>
                    <div class="input-group input-group-sm">
                      <span class="input-group-text">$</span>
                      <input
                        type="number"
                        class="form-control form-control-sm"
                        name={`price-${idx}`}
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                      />
                    </div>
                  </td>
                  <td></td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <input type="hidden" name="item_count" value={String(items.length + extraRows)} />

        <button
          type="button"
          class="btn btn-sm btn-outline-secondary mb-3"
          hx-post={`/receipts/${receipt.id}/edit`}
          hx-target="#receipt-content"
          hx-swap="innerHTML"
          hx-include="closest form"
          hx-vals='{"action": "add_item"}'
        >
          + Add Item
        </button>

        <hr />

        <div class="row g-2 mb-3">
          <div class="col-6">
            <label for="edit-tax" class="form-label form-label-sm">
              Tax
            </label>
            <div class="input-group input-group-sm">
              <span class="input-group-text">$</span>
              <input
                type="number"
                class="form-control form-control-sm"
                id="edit-tax"
                name="tax"
                value={centsToDollars(receipt.tax_cents)}
                step="0.01"
                min="0"
              />
            </div>
          </div>
          <div class="col-6">
            <label for="edit-gratuity" class="form-label form-label-sm">
              Gratuity
            </label>
            <div class="input-group input-group-sm">
              <span class="input-group-text">$</span>
              <input
                type="number"
                class="form-control form-control-sm"
                id="edit-gratuity"
                name="gratuity"
                value={centsToDollars(receipt.gratuity_cents)}
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>

        <table class="table table-sm mb-3">
          <tbody>
            <tr class="fw-bold">
              <td>Computed total</td>
              <td class="text-end">{formatDollars(computedTotal)}</td>
            </tr>
            {originalTotal != null && (
              <tr class="text-muted">
                <td>
                  Receipt total
                  {showMismatchWarning && (
                    <span
                      class="ms-1 text-warning"
                      data-bs-toggle="tooltip"
                      data-bs-placement="top"
                      title={`Mismatch: receipt says ${formatDollars(originalTotal)} but items + tax + gratuity = ${formatDollars(computedTotal)}`}
                    >
                      <i class="bi bi-exclamation-triangle-fill"></i>
                    </span>
                  )}
                </td>
                <td class="text-end">{formatDollars(originalTotal)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div class="d-flex gap-2">
          <button type="submit" class="btn btn-primary btn-sm">
            Save
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            hx-get={`/receipts/${receipt.id}/claim-form${claimerName ? `?name=${encodeURIComponent(claimerName)}` : ""}`}
            hx-target="#receipt-content"
            hx-swap="innerHTML"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
