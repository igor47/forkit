
# Forkit Project Guidelines

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install`
- Use `bun run <script>` instead of `npm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## Framework

This project uses **Hono** as the web framework with JSX rendering and **HTMX** for interactivity.

- We use `hono/jsx-renderer` for server-side rendering
- All routes use `c.render()` to render components with the Layout
- Bootstrap 5 is used for styling (via CDN in Layout, dark theme)
- HTMX + idiomorph for dynamic behavior without client-side JS frameworks
- Interactive forms use `hx-post` with `morph:outerHTML` swap for smooth re-renders

## Project Structure

```
src/
├── app.ts              # Main app entry point, registers routes and middleware
├── config.ts           # Configuration from environment variables
├── db.ts               # SQLite database singleton (with setDb for test injection)
├── db/
│   ├── migrate.ts      # Simple SQL migration runner
│   ├── receipts.ts     # Receipt CRUD + processing status
│   └── receipt_items.ts # Receipt items CRUD + claiming
├── components/
│   ├── Layout.tsx      # Main layout wrapper
│   ├── UploadForm.tsx  # Photo upload form (HTMX)
│   ├── ReceiptView.tsx # Receipt page layout (thumbnail + content area)
│   ├── ReceiptClaim.tsx # Interactive item claiming form (HTMX)
│   └── ReceiptEdit.tsx # Edit items/prices/tax/gratuity form (HTMX)
├── routes/
│   ├── health.ts       # Health check endpoints (/healthz, /readyz)
│   ├── index.tsx       # Home route (/) with upload form
│   └── receipts.tsx    # Receipt upload, view, claim, edit, file serving
├── middleware/
│   ├── requestLogging.ts
│   ├── htmx.ts
│   └── cachingServeStatic.ts
├── lib/
│   ├── logger.ts       # Environment-aware logging
│   ├── ids.ts          # ULID generation
│   ├── ai.ts           # Anthropic SDK client
│   └── parse-receipt.ts # Receipt photo → structured items via Claude
├── migrations/         # SQL migration files (run automatically on startup)
└── test/
    ├── app.ts          # useTestApp() — in-memory SQLite + temp uploads per test
    ├── http.ts         # makeRequest(), parseHtml(), expectElement()
    ├── factories/
    │   └── receipt.ts  # Test receipt/item factories
    └── fixtures/
        └── test-receipt.jpg
```

## Database

This project uses **SQLite** via Bun's built-in `bun:sqlite`.

- Database file at `./data/db/forkit.db` (configurable via `SQLITE_PATH`)
- Uploads at `./data/uploads/` (configurable via `UPLOADS_PATH`)
- WAL mode and foreign keys enabled by default
- Migrations are `.sql` files in `src/migrations/`, run automatically on startup
- Total is always computed (items + tax + gratuity), not stored

## Development

- `mise run app:dev` — Start dev server with hot reload
- `mise run check` — Run Biome linting + TypeScript checks
- `mise run check-fix` — Auto-fix formatting/linting then typecheck
- `mise run test` — Run tests
- `mise run db:migrate` — Apply database migrations manually
- `mise run app:container` — Build and run in Docker

## Testing

- Each test gets a fresh in-memory SQLite database (no transaction rollback needed)
- Temporary uploads directory per test, cleaned up in afterEach
- Use `useTestApp()` for test setup, `makeRequest()` for HTTP assertions
- Factories create test data: `createTestReceipt()`, `createTestReceiptWithItems()`
- HTMX form submissions need `previous_name` field when testing claim updates

## Code Quality

Uses **Biome** for linting and formatting (configured in `biome.json`).

## APIs

- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `@anthropic-ai/sdk` for Claude API. Don't use Vercel AI SDK.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
