/**
 * Get the public-facing origin, respecting reverse proxy headers.
 */
export function getOrigin(c: {
  req: { header: (name: string) => string | undefined; url: string }
}): string {
  const proto = c.req.header("x-forwarded-proto") ?? new URL(c.req.url).protocol.replace(":", "")
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host") ?? new URL(c.req.url).host
  return `${proto}://${host}`
}
