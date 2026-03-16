import type { ReceiptItem } from "@src/db/receipt_items"
import type { Receipt } from "@src/db/receipts"

export interface ReceiptClaimProps {
  receipt: Receipt
  items: ReceiptItem[]
  claimerName: string
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export const ReceiptClaim = ({ receipt, items, claimerName }: ReceiptClaimProps) => {
  const hasName = claimerName.trim().length > 0
  const allItemsTotal = items.reduce((sum, i) => sum + i.price_cents, 0)

  // Compute claimer's share
  const myItems = hasName ? items.filter((i) => i.claimed_by === claimerName) : []
  const myItemsTotal = myItems.reduce((sum, i) => sum + i.price_cents, 0)
  const proportion = allItemsTotal > 0 ? myItemsTotal / allItemsTotal : 0
  const myTax = receipt.tax_cents != null ? Math.round(receipt.tax_cents * proportion) : null
  const myGratuity =
    receipt.gratuity_cents != null ? Math.round(receipt.gratuity_cents * proportion) : null
  const myTotal = myItemsTotal + (myTax ?? 0) + (myGratuity ?? 0)

  return (
    <div id="claim-form">
      <form
        hx-post={`/receipts/${receipt.id}/claim`}
        hx-trigger="change from:input[type='checkbox']"
        hx-target="#claim-form"
        hx-swap="morph:outerHTML"
        hx-ext="morph"
      >
        <input type="hidden" name="previous_name" value={claimerName} />
        <div class="mb-3">
          <label for="claimer-name" class="form-label fw-bold">
            Your Name
          </label>
          <div class="input-group">
            <input
              type="text"
              class="form-control"
              id="claimer-name"
              name="claimer_name"
              value={claimerName}
              placeholder="Enter your name to claim items"
              hx-post={`/receipts/${receipt.id}/claim`}
              hx-trigger="input changed delay:500ms"
              hx-target="#claim-form"
              hx-swap="morph:outerHTML"
              hx-ext="morph"
              hx-include="closest form"
            />
            {hasName && (
              <button
                type="button"
                class="btn btn-outline-secondary"
                hx-post={`/receipts/${receipt.id}/claim`}
                hx-target="#claim-form"
                hx-swap="morph:outerHTML"
                hx-ext="morph"
                hx-vals='{"claimer_name": "", "previous_name": ""}'
                aria-label="Clear name"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {hasName && myItems.length > 0 && (
          <div class="card mb-3">
            <div class="card-body">
              <h5 class="card-title">{claimerName}'s Share</h5>
              <table class="table table-sm mb-0">
                <tbody>
                  <tr>
                    <td>Items subtotal</td>
                    <td class="text-end">{formatDollars(myItemsTotal)}</td>
                  </tr>
                  {myTax != null && (
                    <tr>
                      <td>Tax portion</td>
                      <td class="text-end">{formatDollars(myTax)}</td>
                    </tr>
                  )}
                  {myGratuity != null && (
                    <tr>
                      <td>Tip portion</td>
                      <td class="text-end">{formatDollars(myGratuity)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr class="fw-bold">
                    <td>Your total</td>
                    <td class="text-end">{formatDollars(myTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <table class="table">
            <thead>
              <tr>
                <th style="width: 40px;"></th>
                <th>Item</th>
                <th class="text-end">Price</th>
                <th>Claimed by</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const claimedByMe = item.claimed_by === claimerName && hasName
                const claimedByOther = item.claimed_by != null && !claimedByMe
                return (
                  <tr key={item.id} class={claimedByMe ? "table-success" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        class="form-check-input"
                        name={`item-${item.id}`}
                        value="on"
                        checked={claimedByMe}
                        disabled={!hasName || claimedByOther}
                      />
                    </td>
                    <td>{item.name}</td>
                    <td class="text-end">{formatDollars(item.price_cents)}</td>
                    <td class={claimedByOther ? "text-muted" : ""}>
                      {item.claimed_by ? (
                        <a
                          href={`/receipts/${receipt.id}?name=${encodeURIComponent(item.claimed_by)}`}
                          class={claimedByOther ? "text-muted" : ""}
                        >
                          {item.claimed_by}
                        </a>
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              {receipt.tax_cents != null && (
                <tr>
                  <td colSpan={2}>Tax</td>
                  <td class="text-end">{formatDollars(receipt.tax_cents)}</td>
                  <td></td>
                </tr>
              )}
              {receipt.gratuity_cents != null && (
                <tr>
                  <td colSpan={2}>Gratuity</td>
                  <td class="text-end">{formatDollars(receipt.gratuity_cents)}</td>
                  <td></td>
                </tr>
              )}
              {receipt.total_cents != null && (
                <tr class="fw-bold">
                  <td colSpan={2}>Total</td>
                  <td class="text-end">{formatDollars(receipt.total_cents)}</td>
                  <td></td>
                </tr>
              )}
            </tfoot>
          </table>
        )}
      </form>
    </div>
  )
}
