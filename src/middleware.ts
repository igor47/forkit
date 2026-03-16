import type { Hono } from "hono"
import { htmxMiddleware } from "./middleware/htmx"
import { requestLoggingMiddleware } from "./middleware/requestLogging"

export function applyMiddleware(app: Hono) {
  app.use("*", requestLoggingMiddleware)
  app.use("*", htmxMiddleware)
}
