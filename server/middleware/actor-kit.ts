import { tryGetActorRuntimeEnv } from "../../src/server-env";
import { actorKitRouter } from "../../src/game.server";
import { resolveSession, type SessionEvent } from "../../src/session-middleware";

export default async function middleware(event: SessionEvent) {
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

  // Page and server-function requests: sign the visitor in, and keep them signed in.
  return resolveSession(event);
}
