export interface ModeToggleProps {
  receiptId: string
  claimerName: string
  editMode: boolean
}

export const ModeToggle = ({ receiptId, claimerName, editMode }: ModeToggleProps) => {
  const nameParam = claimerName ? `?name=${encodeURIComponent(claimerName)}` : ""

  return (
    <div class="btn-group btn-group-sm mt-2" id="mode-toggle">
      <button
        type="button"
        class={`btn ${!editMode ? "btn-primary" : "btn-outline-primary"}`}
        hx-get={`/receipts/${receiptId}/claim-form${nameParam}`}
        hx-target="#receipt-content"
        hx-swap="innerHTML"
        hx-replace-url={`/receipts/${receiptId}${nameParam}`}
      >
        Claim
      </button>
      <button
        type="button"
        class={`btn ${editMode ? "btn-secondary" : "btn-outline-secondary"}`}
        hx-get={`/receipts/${receiptId}/edit${nameParam}`}
        hx-target="#receipt-content"
        hx-swap="innerHTML"
        hx-replace-url={`/receipts/${receiptId}/edit`}
      >
        Edit
      </button>
    </div>
  )
}
