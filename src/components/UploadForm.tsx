export interface UploadFormProps {
  error?: string
}

export const UploadForm = ({ error }: UploadFormProps) => {
  return (
    <div id="upload-form">
      <h2>Upload a Receipt</h2>
      <p class="text-muted">Take a photo of your restaurant receipt to split the bill.</p>

      {error && (
        <div class="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <form
        hx-post="/receipts/upload"
        hx-encoding="multipart/form-data"
        hx-target="#upload-form"
        hx-swap="outerHTML"
        hx-disabled-elt="#upload-btn"
        hx-indicator="#upload-spinner"
      >
        <div class="mb-3">
          <label for="photo" class="form-label">
            Receipt Photo
          </label>
          <input
            type="file"
            class="form-control"
            id="photo"
            name="photo"
            accept="image/*"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary" id="upload-btn">
          <span
            id="upload-spinner"
            class="htmx-indicator spinner-border spinner-border-sm me-1"
            role="status"
            aria-hidden="true"
          ></span>
          Upload
        </button>
      </form>
    </div>
  )
}
