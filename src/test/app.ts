import { Database } from "bun:sqlite"
import { afterEach, beforeEach } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Hono } from "hono"
import { createApp } from "../app"
import { config } from "../config"
import { closeDb, setDb } from "../db"
import { runMigrationsWithDb } from "../db/migrate"

interface TestContext {
  app: Hono
  db: Database
  uploadsDir: string
}

/**
 * Sets up a fresh test app for each test with an in-memory SQLite database
 * and a temporary uploads directory.
 *
 * Usage:
 *   const testCtx = useTestApp()
 *   // access testCtx.app, testCtx.db, testCtx.uploadsDir in tests
 */
export function useTestApp(): TestContext {
  const ctx: TestContext = {} as TestContext

  beforeEach(() => {
    // Create temp uploads dir
    ctx.uploadsDir = mkdtempSync(join(tmpdir(), "forkit-test-"))

    // Override config for tests
    ;(config as any).uploadsPath = ctx.uploadsDir

    // Create in-memory database with migrations
    ctx.db = new Database(":memory:")
    ctx.db.exec("PRAGMA foreign_keys = ON")
    runMigrationsWithDb(ctx.db)

    // Inject test db into the global singleton so routes use it
    setDb(ctx.db)

    // Create app
    ctx.app = createApp()
  })

  afterEach(() => {
    closeDb()
    rmSync(ctx.uploadsDir, { recursive: true, force: true })
  })

  return ctx
}
