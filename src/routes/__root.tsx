import { useEffect, type ReactNode } from "react";
import { installTelemetry, reportError } from "../client-telemetry";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createAccessToken, createActorFetch } from "actor-kit/server";
import type { SessionMachine } from "../session.machine";
import { SessionProvider } from "../session.context";
import { getRequestSession } from "../request-session";
import { getServerEnv, tryGetActorRuntimeEnv } from "../server-env";
import type { Caller } from "actor-kit";
import appCss from "../styles.css?url";

export const loadSession = createServerFn({ method: "GET" }).handler(async () => {
  const env = getServerEnv();
  const session = getRequestSession(getRequest());
  if (!session) {
    throw new Error("Session not initialized");
  }

  const caller: Caller = {
    id: session.userId,
    type: "client",
  };

  const accessToken = await createAccessToken({
    signingKey: env.ACTOR_KIT_SECRET,
    actorId: session.sessionId,
    actorType: "session",
    callerId: caller.id,
    callerType: caller.type,
  });

  const runtimeEnv = tryGetActorRuntimeEnv();

  const payload = runtimeEnv
    ? await getSessionSnapshotFromRuntimeEnv(
        runtimeEnv,
        session.sessionId,
        caller
      )
    : await getSessionSnapshotFromHost(
        env.ACTOR_KIT_HOST,
        session.sessionId,
        accessToken
      );

  return {
    sessionId: session.sessionId,
    userId: session.userId,
    accessToken,
    payload,
    host: env.ACTOR_KIT_HOST,
  };
});

async function getSessionSnapshotFromHost(
  host: string,
  sessionId: string,
  accessToken: string
) {
  const fetchSession = createActorFetch<SessionMachine>({
    actorType: "session",
    host,
  });
  return fetchSession({ actorId: sessionId, accessToken });
}

async function getSessionSnapshotFromRuntimeEnv(
  runtimeEnv: NonNullable<ReturnType<typeof tryGetActorRuntimeEnv>>,
  sessionId: string,
  caller: Caller
) {
  const durableObjectId = runtimeEnv.SESSION.idFromName(sessionId);
  const durableObject = runtimeEnv.SESSION.get(durableObjectId) as {
    spawn: (props: {
      actorType: string;
      actorId: string;
      caller: Caller;
      input: Record<string, unknown>;
    }) => Promise<void>;
    getSnapshot: (caller: Caller) => Promise<{
      snapshot: Awaited<
        ReturnType<ReturnType<typeof createActorFetch<SessionMachine>>>
      >["snapshot"];
      checksum: string;
    }>;
  };

  await durableObject.spawn({
    actorType: "session",
    actorId: sessionId,
    caller,
    input: {},
  });

  return durableObject.getSnapshot(caller);
}

export const Route = createRootRoute({
  ssr: "data-only",
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Trivia Jam",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],
  }),
  loader: async () => loadSession(),
  shellComponent: RootDocument,
  component: RootComponent,
  errorComponent: RootError,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** A render error anywhere: report it (type/message only) and show a calm printed card. */
function RootError({ error }: { error: Error }) {
  // Reporting is a side effect on an external system, once per error.
  useEffect(() => reportError(error, { boundary: "root" }), [error]);
  return (
    <div className="riso flex min-h-screen items-center justify-center p-8 text-center">
      <div className="sheet max-w-md px-8 py-10">
        <h1 className="misreg mb-4 text-4xl font-extrabold">Oops</h1>
        <p className="mb-6 text-lg">Something went wrong. Reload to jump back in.</p>
        <button type="button" className="pbtn pbtn-pink pbtn-lg" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    </div>
  );
}

function RootComponent() {
  const { host, sessionId, accessToken, payload } = Route.useLoaderData();
  // Client errors and sessions go to this Worker's /events (subscribes to window events once).
  useEffect(() => installTelemetry(window.location.pathname.startsWith("/spectate") ? "tv" : "phone"), []);

  return (
    <SessionProvider
      host={host}
      actorId={sessionId}
      checksum={payload.checksum}
      accessToken={accessToken}
      initialSnapshot={payload.snapshot}
    >
      <Outlet />
    </SessionProvider>
  );
}
