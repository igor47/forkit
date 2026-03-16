import { Hono } from "hono"
import { jsxRenderer } from "hono/jsx-renderer"
import { Layout } from "./components/Layout"
import { logger } from "./lib/logger"
import { applyMiddleware } from "./middleware"
import { cachingServeStatic } from "./middleware/cachingServeStatic"
import { healthRoutes } from "./routes/health"
import { indexRoutes } from "./routes/index"
import { receiptsRoutes } from "./routes/receipts"

// Update typescript to indicate the title prop on the layout
// see: https://hono.dev/docs/api/context#render-setrenderer
// biome-ignore-start lint/style/useShorthandFunctionType: this is how the hono docs show it
declare module "hono" {
  interface ContextRenderer {
    (content: string | Promise<string>, props: { title: string }): Response
  }
}
// biome-ignore-end lint/style/useShorthandFunctionType: this is how the hono docs show it

export function createApp() {
  const app = new Hono()

  // Health checks (no middleware, no auth, no logging)
  app.route("/", healthRoutes)

  // JSX renderer — use the layout for all routes
  app.use(
    jsxRenderer((props) => {
      return Layout({ ...props })
    })
  )

  // Middleware
  applyMiddleware(app)

  // Serve static files
  app.use("/static/*", cachingServeStatic({ root: "./" }))
  app.use("/favicon.ico", cachingServeStatic({ path: "./static/favicon.ico" }))

  // Routes
  app.route("/", indexRoutes)
  app.route("/", receiptsRoutes)

  // Error handler
  app.onError((err, c) => {
    logger.error("Unhandled error", err, { path: c.req.path })
    return c.text("Internal Server Error", 500)
  })

  return app
}
