import { dirname } from "node:path"

const repoRoot = dirname(import.meta.dir)

export const config = {
  repoRoot,
  port: parseInt(process.env.PORT || "3000", 10),
  sqlitePath: process.env.SQLITE_PATH || "./data/db/forkit.db",
  uploadsPath: process.env.UPLOADS_PATH || "./data/uploads",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  aiModelName: process.env.AI_MODEL_NAME || "claude-sonnet-4-20250514",
  cookieSecret: process.env.COOKIE_SECRET || "your-secret-key-should-be-in-env",
  oidcIssuerUrl: process.env.OIDC_ISSUER_URL || "",
  oidcClientId: process.env.OIDC_CLIENT_ID || "",
  oidcClientSecret: process.env.OIDC_CLIENT_SECRET || "",
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
} as const

export function isOidcEnabled(): boolean {
  return !!(config.oidcIssuerUrl && config.oidcClientId && config.oidcClientSecret)
}

// Print config as JSON when run directly
if (import.meta.main) {
  console.log(JSON.stringify(config, null, 2))
}
