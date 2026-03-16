import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { getDb } from "../db"

const MIGRATIONS_DIR = join(import.meta.dir, "..", "migrations")

/**
 * Simple migration runner for SQLite.
 * Reads .sql files from src/migrations/ in sorted order.
 * Tracks applied migrations in a _migrations table.
 */
export function runMigrations(): void {
  const db = getDb()

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  // Get already-applied migrations
  const applied = new Set(
    db
      .query("SELECT name FROM _migrations")
      .all()
      .map((r: any) => r.name)
  )

  // Read and sort migration files
  let files: string[]
  try {
    files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort()
  } catch {
    files = []
  }

  // Apply pending migrations
  let count = 0
  for (const file of files) {
    if (applied.has(file)) continue

    const content = readFileSync(join(MIGRATIONS_DIR, file), "utf-8")
    db.exec(content)
    db.run("INSERT INTO _migrations (name) VALUES (?)", [file])
    console.log(`Applied migration: ${file}`)
    count++
  }

  if (count === 0) {
    console.log("No pending migrations.")
  } else {
    console.log(`Applied ${count} migration(s).`)
  }
}

// Run when executed directly
if (import.meta.main) {
  runMigrations()
}
