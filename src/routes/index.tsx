import { UploadForm } from "@src/components/UploadForm"
import { isOidcEnabled } from "@src/config"
import { Hono } from "hono"

export const indexRoutes = new Hono()

indexRoutes.get("/", (c) => {
  const user = c.get("user")
  const needsLogin = isOidcEnabled() && !user

  return c.render(
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          {needsLogin ? (
            <div class="text-center">
              <h2>Upload a Receipt</h2>
              <p class="text-muted">Sign in to upload and split a restaurant receipt.</p>
              <a href="/auth/login" class="btn btn-primary">
                Sign in to get started
              </a>
            </div>
          ) : (
            <UploadForm />
          )}
        </div>
      </div>
    </div>,
    { title: "Forkit" }
  )
})
