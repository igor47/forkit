import { config } from "@src/config"
import { logger } from "@src/lib/logger"
import { clearAuthCookie, setAuthCookie } from "@src/middleware/auth"
import { Hono } from "hono"
import { getSignedCookie, setSignedCookie } from "hono/cookie"
import * as client from "openid-client"

export const authRoutes = new Hono()

let oidcConfig: client.Configuration | null = null

async function getOidcConfig(): Promise<client.Configuration> {
  if (!oidcConfig) {
    oidcConfig = await client.discovery(
      new URL(config.oidcIssuerUrl),
      config.oidcClientId,
      config.oidcClientSecret
    )
  }
  return oidcConfig
}

function generateState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

authRoutes.get("/auth/login", async (c) => {
  const redirect = c.req.query("redirect") || "/"

  const oidc = await getOidcConfig()
  const state = generateState()
  const origin = new URL(c.req.url).origin
  const redirectUri = `${origin}/auth/callback`

  // Store state + redirect in a short-lived cookie
  await setSignedCookie(
    c,
    "forkit_auth_state",
    JSON.stringify({ state, redirect }),
    config.cookieSecret,
    { httpOnly: true, sameSite: "Lax", maxAge: 600, path: "/" }
  )

  const params: Record<string, string> = {
    redirect_uri: redirectUri,
    scope: "openid profile email",
    state,
  }

  const authUrl = client.buildAuthorizationUrl(oidc, params)
  return c.redirect(authUrl.href)
})

authRoutes.get("/auth/callback", async (c) => {
  const stateCookie = await getSignedCookie(c, config.cookieSecret, "forkit_auth_state")
  if (!stateCookie) {
    return c.text("Invalid auth state", 400)
  }

  let storedState: { state: string; redirect: string }
  try {
    storedState = JSON.parse(stateCookie)
  } catch {
    return c.text("Invalid auth state", 400)
  }

  const oidc = await getOidcConfig()

  try {
    const tokens = await client.authorizationCodeGrant(oidc, new URL(c.req.url), {
      expectedState: storedState.state,
      idTokenExpected: true,
    })

    const claims = tokens.claims()
    if (!claims) {
      return c.text("No claims in token", 400)
    }

    const sub = claims.sub
    const name = (claims.name as string) || (claims.email as string) || sub

    await setAuthCookie(c, { sub, name })

    // Clear the state cookie
    await setSignedCookie(c, "forkit_auth_state", "", config.cookieSecret, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 0,
      path: "/",
    })

    return c.redirect(storedState.redirect || "/")
  } catch (e) {
    logger.error("OIDC callback failed", e as Error)
    return c.text("Authentication failed", 500)
  }
})

authRoutes.get("/auth/logout", async (c) => {
  await clearAuthCookie(c)
  return c.redirect("/")
})
