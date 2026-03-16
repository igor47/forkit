import type { ReceiptItem } from "@src/db/receipt_items"
import type { Receipt } from "@src/db/receipts"

export interface ReceiptViewProps {
  receipt: Receipt
  items: ReceiptItem[]
}

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export const ReceiptView = ({ receipt, items }: ReceiptViewProps) => {
  const uploadUrl = `/uploads/${receipt.filename}`

  return (
    <div>
      <h2>Receipt</h2>
      <p class="text-muted">Uploaded {receipt.created_at}</p>

      <div class="row">
        <div class="col-md-3">
          <a href={uploadUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={uploadUrl}
              alt="Uploaded receipt"
              class="receipt-thumbnail img-fluid"
              style="max-width: 200px; cursor: pointer;"
            />
          </a>
        </div>

        <div class="col-md-9">
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

          {items.length > 0 && (
            <table class="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th class="text-end">Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td class="text-end">{formatDollars(item.price_cents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {receipt.tax_cents != null && (
                  <tr>
                    <td>Tax</td>
                    <td class="text-end">{formatDollars(receipt.tax_cents)}</td>
                  </tr>
                )}
                {receipt.gratuity_cents != null && (
                  <tr>
                    <td>Gratuity</td>
                    <td class="text-end">{formatDollars(receipt.gratuity_cents)}</td>
                  </tr>
                )}
                {receipt.total_cents != null && (
                  <tr class="fw-bold">
                    <td>Total</td>
                    <td class="text-end">{formatDollars(receipt.total_cents)}</td>
                  </tr>
                )}
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
