import { REFRESH_TOKEN_COOKIE_KEY, SESSION_TOKEN_COOKIE_KEY } from "./constants";
import { setRequestSession, type RequestSession } from "./request-session";
import {
  createNewUserSession,
  createRefreshToken,
  createSessionToken,
  getCookie,
  verifyRefreshToken,
  verifySessionToken,
} from "./session-auth";
import { tryGetActorRuntimeEnv } from "./server-env";

/** What the session step needs of nitro's h3 event: the request, its context, and the response headers. */
export type SessionEvent = {
  req: Request;
  res: { headers: Headers };
  context: Record<string, unknown>;
};

const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
const REFRESH_MAX_AGE = 360 * 24 * 60 * 60;

type Resolved = RequestSession & { sessionToken?: string; refreshToken?: string };

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_build/") ||
    pathname.startsWith("/dist/") ||
    pathname.startsWith("/.well-known/") ||
    /\.\w+$/.test(pathname)
  );
}

async function renewFromRefreshToken(token: string, secret: string): Promise<Resolved | null> {
  const refresh = await verifyRefreshToken({ token, secret });
  if (!refresh) return null;
  const sessionId = crypto.randomUUID();
  return {
    userId: refresh.userId,
    sessionId,
    sessionToken: await createSessionToken({ userId: refresh.userId, sessionId, secret }),
    refreshToken: await createRefreshToken({ userId: refresh.userId, secret }),
  };
}

async function resolve(request: Request, secret: string): Promise<Resolved> {
  const sessionToken = getCookie(request, SESSION_TOKEN_COOKIE_KEY);
  if (sessionToken) {
    const session = await verifySessionToken({ token: sessionToken, secret });
    if (session) return { userId: session.userId, sessionId: session.sessionId };
  }
  const refreshToken = getCookie(request, REFRESH_TOKEN_COOKIE_KEY);
  const renewed = refreshToken ? await renewFromRefreshToken(refreshToken, secret) : null;
  return renewed ?? createNewUserSession({ secret });
}

function cookie(name: string, value: string, maxAge: number, secure: boolean) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

/**
 * Signs the visitor in for a page or server-function request: verifies their session cookie (or
 * renews it from the refresh cookie, or starts a new user), records the session for this request's
 * loaders, and sets the cookies whenever it issued new tokens, so a reload is the same user.
 * Returns undefined so the request carries on to the app.
 */
export async function resolveSession(event: SessionEvent): Promise<undefined> {
  const url = new URL(event.req.url);
  if (isStaticAsset(url.pathname)) return undefined;

  // Can't use getServerEnv() here: it needs the h3 event TanStack Start sets up after middleware.
  const secret =
    tryGetActorRuntimeEnv()?.SESSION_JWT_SECRET ??
    (process.env.SESSION_JWT_SECRET || "dev-session-secret");

  const { userId, sessionId, sessionToken, refreshToken } = await resolve(event.req, secret);
  setRequestSession(event.context, { userId, sessionId });

  const secure = url.protocol === "https:";
  if (sessionToken) {
    event.res.headers.append("set-cookie", cookie(SESSION_TOKEN_COOKIE_KEY, sessionToken, SESSION_MAX_AGE, secure));
  }
  if (refreshToken) {
    event.res.headers.append("set-cookie", cookie(REFRESH_TOKEN_COOKIE_KEY, refreshToken, REFRESH_MAX_AGE, secure));
  }
  return undefined;
}
