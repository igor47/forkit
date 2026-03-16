import type { Hono } from "hono"
import type { AuthVariables } from "./middleware/auth"
import { authMiddleware } from "./middleware/auth"
import { htmxMiddleware } from "./middleware/htmx"
import { requestLoggingMiddleware } from "./middleware/requestLogging"

declare module "hono" {
  interface ContextVariableMap extends AuthVariables {}
}

export function applyMiddleware(app: Hono) {
  app.use("*", requestLoggingMiddleware)
  app.use("*", authMiddleware)
  app.use("*", htmxMiddleware)
}
