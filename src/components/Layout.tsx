import type { Child } from "hono/jsx"

export interface LayoutProps {
  children?: Child[] | Child
  title?: string
}

export const Layout = ({ children, title = "Forkit" }: LayoutProps) => {
  return (
    <html lang="en">
      <head>
        <title>{title}</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Favicon */}
        <link rel="apple-touch-icon" sizes="180x180" href="/static/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/static/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/static/favicon-16x16.png" />
        <link rel="manifest" href="/static/site.webmanifest" />

        {/* Bootstrap */}
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB"
          crossorigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
        />
        <link href="/static/styles.css" rel="stylesheet" />

        {/* HTMX */}
        <script src="/static/htmx.min.js"></script>
        <script src="/static/idiomorph-ext.min.js"></script>
      </head>
      <body data-bs-theme="dark">
        <nav class="navbar navbar-expand-lg bg-body-tertiary">
          <div class="container-fluid">
            <a class="navbar-brand d-flex align-items-center gap-2" href="/">
              <img
                src="/static/favicon-32x32.png"
                alt=""
                width="24"
                height="24"
                class="rounded-circle bg-light p-1"
              />
              Forkit
            </a>
          </div>
        </nav>

        <main>{children}</main>

        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI"
          crossorigin="anonymous"
        />
      </body>
    </html>
  )
}
