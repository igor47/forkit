import { describe, expect, test } from "bun:test"
import { getOrigin } from "./url"

function mockContext(url: string, headers: Record<string, string> = {}) {
  return {
    req: {
      url,
      header: (name: string) => headers[name.toLowerCase()],
    },
  }
}

describe("getOrigin", () => {
  test("returns origin from URL when no proxy headers", () => {
    const c = mockContext("http://localhost:3000/some/path")
    expect(getOrigin(c)).toBe("http://localhost:3000")
  })

  test("uses x-forwarded-proto for scheme", () => {
    const c = mockContext("http://localhost:3000/path", {
      "x-forwarded-proto": "https",
      host: "localhost:3000",
    })
    expect(getOrigin(c)).toBe("https://localhost:3000")
  })

  test("uses x-forwarded-host for hostname", () => {
    const c = mockContext("http://localhost:3000/path", {
      "x-forwarded-host": "forkit.example.com",
    })
    expect(getOrigin(c)).toBe("http://forkit.example.com")
  })

  test("uses both forwarded headers together", () => {
    const c = mockContext("http://localhost:3000/path", {
      "x-forwarded-proto": "https",
      "x-forwarded-host": "forkit.example.com",
    })
    expect(getOrigin(c)).toBe("https://forkit.example.com")
  })

  test("falls back to host header when no forwarded host", () => {
    const c = mockContext("http://localhost:3000/path", {
      host: "myapp:8080",
    })
    expect(getOrigin(c)).toBe("http://myapp:8080")
  })
})
