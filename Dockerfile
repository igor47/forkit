# syntax=docker/dockerfile:1.7

FROM oven/bun:latest AS deps
WORKDIR /app

COPY bun.lock package.json tsconfig.json ./
RUN bun install --ci --production

FROM oven/bun:latest AS runtime
WORKDIR /app

# Pull node modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application files
COPY . .

# Overlay generated static files from deps stage (after postinstall)
COPY --from=deps /app/static/htmx.min.js /app/static/idiomorph-ext.min.js ./static/

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

# Data directory for SQLite + uploads (mount a volume here)
RUN mkdir -p /app/data/db /app/data/uploads
VOLUME ["/app/data"]

CMD ["bun", "run", "main.ts"]
