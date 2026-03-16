import { Hono } from "hono"

export const indexRoutes = new Hono()

indexRoutes.get("/", (c) => {
  return c.render(
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-8 text-center">
          <h1>Forkit</h1>
          <p class="lead">Your self-hosted service is running.</p>
        </div>
      </div>
    </div>,
    { title: "Forkit" }
  )
})
