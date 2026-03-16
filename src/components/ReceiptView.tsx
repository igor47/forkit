import type { Receipt } from "@src/db/receipts"

export interface ReceiptViewProps {
  receipt: Receipt
}

export const ReceiptView = ({ receipt }: ReceiptViewProps) => {
  const uploadUrl = `/uploads/${receipt.filename}`

  return (
    <div>
      <h2>Receipt</h2>
      <p class="text-muted">Uploaded {receipt.created_at}</p>

      <a href={uploadUrl} target="_blank" rel="noopener noreferrer">
        <img
          src={uploadUrl}
          alt="Uploaded receipt"
          class="receipt-thumbnail"
          style="max-width: 200px; cursor: pointer;"
        />
      </a>
    </div>
  )
}
