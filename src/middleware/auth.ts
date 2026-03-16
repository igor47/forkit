import { config, isOidcEnabled } from "@src/config"
import type { Context } from "hono"
import { getSignedCookie, setSignedCookie } from "hono/cookie"
import { createMiddleware } from "hono/factory"

export interface AuthUser {
  sub: string
  name: string
}

export interface AuthVariables {
  user: AuthUser | null
}

const COOKIE_NAME = "forkit_session"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

/**
 * Auth middleware — reads session cookie and populates c.var.user on every request.
 */
export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const raw = await getSignedCookie(c, config.cookieSecret, COOKIE_NAME)
  if (raw) {
    try {
      const user = JSON.parse(raw) as AuthUser
      if (user.sub) {
        c.set("user", user)
        return next()
      }
    } catch {
      // Invalid cookie, ignore
    }
  }
  c.set("user", null)
  return next()
})

/**
 * Require authentication. If OIDC is not configured, passes through.
 * If OIDC is configured and user is not logged in, redirects to login.
 */
export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  if (!isOidcEnabled()) {
    return next()
  }
  if (c.get("user")) {
    return next()
  }
  const redirect = encodeURIComponent(c.req.url)
  return c.redirect(`/auth/login?redirect=${redirect}`)
})

export async function setAuthCookie(c: Context, user: AuthUser) {
  await setSignedCookie(c, COOKIE_NAME, JSON.stringify(user), config.cookieSecret, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "Lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  })
}

export async function clearAuthCookie(c: Context) {
  await setSignedCookie(c, COOKIE_NAME, "", config.cookieSecret, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: "Lax",
    maxAge: 0,
    path: "/",
  })
}
