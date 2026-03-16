
# Forkit Project Guidelines

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>`
- Bun automatically loads .env, so don't use dotenv.

## Framework

This project uses **Hono** as the web framework with JSX rendering and **HTMX** for interactivity.

- We use `hono/jsx-renderer` for server-side rendering
- All routes use `c.render()` to render components with the Layout
- Bootstrap 5 is used for styling (via CDN in Layout)
- HTMX + idiomorph for dynamic behavior without client-side JS frameworks

## Project Structure

```
src/
├── app.ts              # Main app entry point, registers routes and middleware
├── config.ts           # Configuration from environment variables
├── db.ts               # SQLite database singleton
├── db/
│   └── migrate.ts      # Simple SQL migration runner
├── components/         # JSX components
│   └── Layout.tsx      # Main layout wrapper
├── routes/             # Route handlers
│   ├── health.ts       # Health check endpoints
│   └── index.tsx       # Home route (/)
├── middleware/          # HTTP middleware
│   ├── requestLogging.ts
│   ├── htmx.ts
│   └── cachingServeStatic.ts
├── lib/                # Utilities
│   ├── logger.ts       # Environment-aware logging
│   └── ids.ts          # ULID generation
└── migrations/         # SQL migration files
```

## Database

This project uses **SQLite** via Bun's built-in `bun:sqlite`.

- Database file lives at `./data/forkit.db` (configurable via `SQLITE_PATH` env var)
- WAL mode and foreign keys are enabled by default
- Migrations are plain `.sql` files in `src/migrations/`, run via `mise run db:migrate`

## Development

- `mise run app:dev` — Start dev server with hot reload
- `mise run check` — Run Biome linting + TypeScript checks
- `mise run check-fix` — Auto-fix formatting/linting then typecheck
- `mise run test` — Run tests
- `mise run db:migrate` — Apply database migrations

## Code Quality

Uses **Biome** for linting and formatting (configured in `biome.json`).

## Deployment

Built as a Docker container. CI/CD via GitHub Actions pushes to GHCR on tagged releases (`v*`).
Mount a volume at `/app/data` for SQLite persistence.

## APIs

- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
