# Forkit

A self-hosted receipt splitting service. Upload a photo of a restaurant receipt, and Forkit uses Claude to extract the itemized list. Then pass the phone around the table so everyone can claim their items and see their share of the bill, including proportional tax and tip.

## How it works

1. **Upload** a photo of your restaurant receipt
2. **AI parses** the receipt into line items, tax, total, and restaurant name
3. **Edit** if needed -- fix item names/prices, add gratuity, split bundled items (e.g. "2 Green Salad")
4. **Claim** -- enter your name and check off what you ordered
5. **Share** -- hit the Share button to copy the link so everyone can claim from their own phone
6. **See your share** -- items subtotal + proportional tax + proportional tip = what you owe

## Self-hosting

Forkit runs as a single Docker container with SQLite for storage.

### Quick start with Docker

```bash
docker run -d \
  -p 3000:3000 \
  -v forkit-data:/app/data \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  ghcr.io/igor47/forkit:latest
```

### Docker Compose

```yaml
services:
  forkit:
    image: ghcr.io/igor47/forkit:latest
    ports:
      - "3000:3000"
    volumes:
      - forkit-data:/app/data
    environment:
      - ANTHROPIC_API_KEY=sk-ant-...

volumes:
  forkit-data:
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port (inside the container, always 3000) |
| `ANTHROPIC_API_KEY` | *(none)* | Required for AI receipt parsing |
| `AI_MODEL_NAME` | `claude-sonnet-4-20250514` | Claude model to use |
| `SQLITE_PATH` | `./data/db/forkit.db` | SQLite database file path |
| `UPLOADS_PATH` | `./data/uploads` | Uploaded receipt photos directory |

### Data persistence

Mount a volume at `/app/data`. This contains:
- `db/forkit.db` -- SQLite database
- `uploads/` -- uploaded receipt photos

Migrations run automatically on startup.

## Development

Requires [mise](https://mise.jdx.dev/) for tool management (installs Bun automatically).

```bash
# Install dependencies
mise run install

# Start dev server (hot reload)
mise run app:dev

# Run checks (lint + typecheck)
mise run check

# Run tests
mise run test

# Build and run in Docker locally
mise run app:container
```

Set your Anthropic API key in `mise.local.toml`:

```toml
[env]
ANTHROPIC_API_KEY = "sk-ant-..."
```

## Tech stack

- [Bun](https://bun.sh) runtime
- [Hono](https://hono.dev) web framework with JSX server-side rendering
- [HTMX](https://htmx.org) + [idiomorph](https://github.com/bigskysoftware/idiomorph) for interactive UI
- [Bootstrap 5](https://getbootstrap.com) (dark theme)
- [SQLite](https://www.sqlite.org) via `bun:sqlite`
- [Anthropic Claude API](https://docs.anthropic.com) for receipt parsing
- [Biome](https://biomejs.dev) for linting/formatting
