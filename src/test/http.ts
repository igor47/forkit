import type { Hono } from "hono"
import { parseHTML } from "linkedom"

interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: string | FormData
  cookies?: string[]
}

/**
 * Make an HTTP request to the test app.
 */
export async function makeRequest(
  app: Hono,
  path: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { method = "GET", headers = {}, body, cookies } = options

  if (cookies?.length) {
    headers.Cookie = cookies.join("; ")
  }

  const req = new Request(`http://localhost${path}`, {
    method,
    headers,
    body,
  })

  return app.fetch(req)
}

/**
 * Parse an HTML response into a DOM Document.
 */
export async function parseHtml(response: Response) {
  const html = await response.text()
  const { document } = parseHTML(html)
  return document
}

/**
 * Assert an element exists and return it.
 */
export function expectElement(document: Document, selector: string): Element {
  const el = document.querySelector(selector)
  if (!el) {
    throw new Error(`Expected element matching "${selector}" but found none`)
  }
  return el
}
