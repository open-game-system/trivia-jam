import { tryGetActorRuntimeEnv } from "../../src/server-env";
import { actorKitRouter } from "../../src/game.server";
import { resolveSession, type SessionEvent } from "../../src/session-middleware";
import { SERVICE, pathTemplate, versionOf, withWideEvent } from "../../src/wide-event";
import { handleEvents } from "../../src/events-route";
import { EVENTS_PATH } from "../../src/client-telemetry";

export default async function middleware(event: SessionEvent) {
  const url = new URL(event.req.url);
  const runtimeEnv = tryGetActorRuntimeEnv();

  // One wide event per request this middleware handles (path with ids templated, never query strings).
  return withWideEvent(
    {
      event: "http.request",
      service: SERVICE,
      version: versionOf(runtimeEnv),
      source: "server",
      method: event.req.method,
      path: pathTemplate(url.pathname),
    },
    async (ctx) => {
      if (url.pathname === "/health") {
        ctx.set({ route: "health" });
        return new Response("ok");
      }

      // Client telemetry: each event becomes its own wide event (source: "client"). Same-origin only.
      if (url.pathname === EVENTS_PATH && event.req.method === "POST") {
        ctx.set({ route: "events" });
        const origin = event.req.headers.get("origin");
        if (origin && new URL(origin).host !== url.host) return new Response("forbidden", { status: 403 });
        return handleEvents(event.req, { service: SERVICE });
      }

      // Route /api/* to actor-kit (only in Cloudflare runtime where DOs are available)
      if (url.pathname.startsWith("/api/")) {
        ctx.set({ route: "actor-kit" });
        if (runtimeEnv) {
          const res = await actorKitRouter(event.req, runtimeEnv);
          ctx.set({ status: res.status });
          return res;
        }
        // In dev, actor-kit routes are handled by the dev server's own DO emulation
        return undefined;
      }

      // Page and server-function requests: sign the visitor in, and keep them signed in.
      ctx.set({ route: "page" });
      return resolveSession(event);
    },
  );
}
