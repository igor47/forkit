import { getDb } from "@src/db"
import { Hono } from "hono"

export const healthRoutes = new Hono()

// Liveness probe - lightweight, no dependencies
healthRoutes.get("/healthz", (c) => {
  return c.json({ status: "ok" })
})

// Readiness probe - checks DB connectivity
healthRoutes.get("/readyz", (c) => {
  try {
    const db = getDb()
    db.query("SELECT 1").get()
    return c.json({ status: "ready", database: "connected" })
  } catch (_err) {
    return c.json({ status: "not ready", database: "disconnected" }, 503)
  }
})
