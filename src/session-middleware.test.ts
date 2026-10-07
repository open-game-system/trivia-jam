// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sessionFromContext } from "./request-session";
import { resolveSession } from "./session-middleware";

/** A page request through the middleware, as nitro hands it over (h3 event: req + res headers). */
async function visit(url: string, cookie?: string) {
  const req = new Request(url, { headers: cookie ? { cookie } : {} });
  const res = { headers: new Headers() };
  const context: Record<string, unknown> = {};
  const result = await resolveSession({ req, res, context });
  return { req, res, context, result };
}

/** The `name=value` pairs a browser would send back from Set-Cookie headers. */
function cookieJar(headers: Headers) {
  return headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

describe("session middleware", () => {
  it("a first visit gets a session and the cookies that keep it", async () => {
    const { context, res, result } = await visit("http://localhost:3101/games/abc");

    expect(result).toBeUndefined();
    const session = sessionFromContext(context);
    expect(session?.userId).toEqual(expect.any(String));
    const setCookies = res.headers.getSetCookie();
    expect(setCookies.some((c) => c.startsWith("session-token="))).toBe(true);
    expect(setCookies.some((c) => c.startsWith("refresh-token="))).toBe(true);
    for (const c of setCookies) {
      expect(c).toContain("Path=/");
      expect(c).toContain("HttpOnly");
      expect(c).toContain("SameSite=Lax");
      expect(c).toMatch(/Max-Age=\d+/);
    }
  });

  it("a reload with those cookies is the same user (host keeps host, player keeps seat)", async () => {
    const first = await visit("http://localhost:3101/games/abc");
    const reload = await visit("http://localhost:3101/games/abc", cookieJar(first.res.headers));

    expect(sessionFromContext(first.context)).toBeDefined();
    expect(sessionFromContext(reload.context)?.userId).toBe(sessionFromContext(first.context)?.userId);
    // Nothing to re-issue for a valid session.
    expect(reload.res.headers.getSetCookie()).toEqual([]);
    expect(sessionFromContext(reload.context)?.sessionId).toBe(sessionFromContext(first.context)?.sessionId);
  });

  it("a refresh token alone restores the same user", async () => {
    const first = await visit("http://localhost:3101/");
    const refreshOnly = first.res.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .filter((c) => c.startsWith("refresh-token="))
      .join("; ");

    const later = await visit("http://localhost:3101/", refreshOnly);

    expect(sessionFromContext(later.context)?.userId).toBe(sessionFromContext(first.context)?.userId);
    expect(later.res.headers.getSetCookie().some((c) => c.startsWith("session-token="))).toBe(true);
  });

  it("marks the cookies Secure over https only (WebKit drops Secure cookies on http://localhost)", async () => {
    const https = await visit("https://triviajam.tv/");
    const http = await visit("http://localhost:3101/");

    expect(https.res.headers.getSetCookie()).toHaveLength(2);
    expect(https.res.headers.getSetCookie().every((c) => c.includes("Secure"))).toBe(true);
    expect(http.res.headers.getSetCookie().some((c) => c.includes("Secure"))).toBe(false);
  });

  it("two requests in flight keep their own sessions", async () => {
    const [a, b] = await Promise.all([visit("http://localhost:3101/"), visit("http://localhost:3101/")]);

    expect(sessionFromContext(a.context)?.userId).not.toBe(sessionFromContext(b.context)?.userId);
  });

  it("static assets get no session", async () => {
    const { context, res } = await visit("http://localhost:3101/assets/app.js");

    expect(sessionFromContext(context)).toBeUndefined();
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});
