import { UploadForm } from "@src/components/UploadForm"
import { Hono } from "hono"

export const indexRoutes = new Hono()

indexRoutes.get("/", (c) => {
  return c.render(
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <UploadForm />
        </div>
      </div>
    </div>,
    { title: "Forkit" }
  )
})
