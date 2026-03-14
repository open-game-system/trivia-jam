import { tryGetActorRuntimeEnv } from "../../src/server-env";
import { actorKitRouter } from "../../src/game.server";
import {
  SESSION_TOKEN_COOKIE_KEY,
  REFRESH_TOKEN_COOKIE_KEY,
} from "../../src/constants";
import {
  getCookie,
  verifySessionToken,
  verifyRefreshToken,
  createNewUserSession,
  createSessionToken,
  createRefreshToken,
} from "../../src/session-auth";

type MiddlewareEvent = {
  req: Request;
};

export default async function middleware(event: MiddlewareEvent) {
  const url = new URL(event.req.url);

  if (url.pathname === "/health") {
    return new Response("ok");
  }

  // Route /api/* to actor-kit (only in Cloudflare runtime where DOs are available)
  if (url.pathname.startsWith("/api/")) {
    const runtimeEnv = tryGetActorRuntimeEnv();
    if (runtimeEnv) {
      return actorKitRouter(event.req, runtimeEnv);
    }
    // In dev, actor-kit routes are handled by the dev server's own DO emulation
    return undefined;
  }

  // Skip static assets
  if (
    url.pathname.startsWith("/_build/") ||
    url.pathname.startsWith("/dist/") ||
    url.pathname.startsWith("/.well-known/") ||
    url.pathname.match(/\.\w+$/)
  ) {
    return undefined;
  }

  // Session auth for page requests
  // Can't use getServerEnv() here — it calls getRequestHost() which needs
  // the h3 event from AsyncLocalStorage, but this middleware runs before
  // TanStack Start sets that up. Read secrets directly from __env__ or process.env.
  const runtimeEnv = tryGetActorRuntimeEnv();
  const secret = runtimeEnv?.SESSION_JWT_SECRET
    ?? (process.env.SESSION_JWT_SECRET || "dev-session-secret");

  const accessToken = getCookie(event.req, SESSION_TOKEN_COOKIE_KEY);
  const refreshToken = getCookie(event.req, REFRESH_TOKEN_COOKIE_KEY);

  let userId: string;
  let sessionId: string;
  let newSessionToken: string | undefined;
  let newRefreshToken: string | undefined;

  if (accessToken) {
    const payload = await verifySessionToken({ token: accessToken, secret });
    if (payload) {
      userId = payload.userId;
      sessionId = payload.sessionId;
    } else {
      const refreshPayload = refreshToken
        ? await verifyRefreshToken({ token: refreshToken, secret })
        : null;
      if (refreshPayload) {
        userId = refreshPayload.userId;
        sessionId = crypto.randomUUID();
        newSessionToken = await createSessionToken({
          userId,
          sessionId,
          secret,
        });
        newRefreshToken = await createRefreshToken({ userId, secret });
      } else {
        const newSession = await createNewUserSession({ secret });
        userId = newSession.userId;
        sessionId = newSession.sessionId;
        newSessionToken = newSession.sessionToken;
        newRefreshToken = newSession.refreshToken;
      }
    }
  } else if (refreshToken) {
    const payload = await verifyRefreshToken({ token: refreshToken, secret });
    if (payload) {
      userId = payload.userId;
      sessionId = crypto.randomUUID();
      newSessionToken = await createSessionToken({ userId, sessionId, secret });
      newRefreshToken = await createRefreshToken({ userId, secret });
    } else {
      const newSession = await createNewUserSession({ secret });
      userId = newSession.userId;
      sessionId = newSession.sessionId;
      newSessionToken = newSession.sessionToken;
      newRefreshToken = newSession.refreshToken;
    }
  } else {
    const newSession = await createNewUserSession({ secret });
    userId = newSession.userId;
    sessionId = newSession.sessionId;
    newSessionToken = newSession.sessionToken;
    newRefreshToken = newSession.refreshToken;
  }

  globalThis.__session__ = { userId, sessionId };

  if (newSessionToken || newRefreshToken) {
    globalThis.__sessionCookies__ = {
      sessionToken: newSessionToken,
      refreshToken: newRefreshToken,
    };
  } else {
    globalThis.__sessionCookies__ = undefined;
  }

  return undefined;
}
