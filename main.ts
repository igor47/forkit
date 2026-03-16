import { createApp } from "./src/app"
import { config } from "./src/config"
import { runMigrations } from "./src/db/migrate"

runMigrations()
const app = createApp()
const maxAttempts = 10

for (let attempt = 0; attempt < maxAttempts; attempt++) {
  const port = config.port + attempt
  try {
    Bun.serve({ fetch: app.fetch, port })
    console.log(`Server listening on http://localhost:${port}`)
    break
  } catch (e: any) {
    if (e?.code === "EADDRINUSE" && attempt < maxAttempts - 1) {
      console.warn(`Port ${port} in use, trying ${port + 1}...`)
    } else {
      throw e
    }
  }
}
