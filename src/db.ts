import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import { dirname } from "node:path"
import { config } from "./config"

let db: Database | null = null

/**
 * Get the SQLite database instance (lazy singleton).
 * Creates the data directory and database file if they don't exist.
 */
export function getDb(): Database {
  if (!db) {
    mkdirSync(dirname(config.sqlitePath), { recursive: true })
    db = new Database(config.sqlitePath, { create: true })
    db.exec("PRAGMA journal_mode = WAL")
    db.exec("PRAGMA foreign_keys = ON")
  }
  return db
}

/**
 * Override the database instance (used by tests to inject in-memory DB).
 */
export function setDb(newDb: Database): void {
  db = newDb
}

/**
 * Close the database connection (useful for tests or graceful shutdown).
 */
export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
