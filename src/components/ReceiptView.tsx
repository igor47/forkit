import type { ReceiptItem } from "@src/db/receipt_items"
import type { Receipt } from "@src/db/receipts"
import { ReceiptClaim } from "./ReceiptClaim"
import { ReceiptEdit } from "./ReceiptEdit"

export interface ReceiptViewProps {
  receipt: Receipt
  items: ReceiptItem[]
  claimerName: string
  editMode?: boolean
}

export const ReceiptView = ({
  receipt,
  items,
  claimerName,
  editMode = false,
}: ReceiptViewProps) => {
  const uploadUrl = `/uploads/${receipt.filename}`

  return (
    <div>
      <div class="d-flex align-items-center gap-2 mb-1">
        <h2 class="mb-0">{receipt.restaurant_name || "Receipt"}</h2>
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary"
          onclick="navigator.clipboard.writeText(window.location.href).then(() => { const el = this; el.innerHTML = '<i class=\'bi bi-check\'></i> Copied'; setTimeout(() => { el.innerHTML = '<i class=\'bi bi-link-45deg\'></i> Share'; }, 1500) })"
          title="Copy link to share with your group"
        >
          <i class="bi bi-link-45deg"></i> Share
        </button>
      </div>
      <p class="text-muted">Uploaded {receipt.created_at}</p>

      <div class="row g-4">
        <div class="col-md-4 col-lg-3 text-center">
          <a href={uploadUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={uploadUrl}
              alt="Uploaded receipt"
              class="receipt-thumbnail img-fluid"
              style="max-width: 200px; cursor: pointer;"
            />
          </a>
          {items.length > 0 && (
            <div class="mt-2">
              <button
                type="button"
                class="btn btn-sm btn-primary"
                hx-get={`/receipts/${receipt.id}/edit${claimerName ? `?name=${encodeURIComponent(claimerName)}` : ""}`}
                hx-target="#receipt-content"
                hx-swap="innerHTML"
                hx-replace-url={`/receipts/${receipt.id}/edit`}
              >
                Edit Items
              </button>
            </div>
          )}
        </div>

        <div class="col-md-8 col-lg-9">
          <div id="receipt-content">
            {receipt.processing_error && (
              <div class="alert alert-danger" role="alert">
                <strong>Error parsing receipt:</strong> {receipt.processing_error}
                <div class="mt-3">
                  <a href="/" class="btn btn-primary btn-sm">
                    Try Again
                  </a>
                </div>
              </div>
            )}

            {!receipt.processed_at && !receipt.processing_error && (
              <p class="text-muted">Not yet processed.</p>
            )}

            {items.length > 0 && editMode && (
              <ReceiptEdit receipt={receipt} items={items} claimerName={claimerName} />
            )}

            {items.length > 0 && !editMode && (
              <ReceiptClaim receipt={receipt} items={items} claimerName={claimerName} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
