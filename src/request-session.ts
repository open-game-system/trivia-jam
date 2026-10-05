import { z } from "zod";

/**
 * The signed-in session of one request, kept on that request's context object: nitro's h3 event
 * and TanStack Start's event share `request.context`, so the session middleware writes it there
 * and route loaders read it back with getRequest(). Per request, never a module global, so
 * concurrent requests on one Worker isolate can't read each other's session.
 */
const SessionSchema = z.object({ userId: z.string(), sessionId: z.string() });
export type RequestSession = z.infer<typeof SessionSchema>;

const KEY = "triviaJamSession";
const ContextSchema = z.object({ [KEY]: SessionSchema });

export function setRequestSession(context: Record<string, unknown>, session: RequestSession): void {
  context[KEY] = session;
}

/** The session the middleware recorded on this request context, if any. */
export function sessionFromContext(context: unknown): RequestSession | undefined {
  const parsed = ContextSchema.safeParse(context);
  return parsed.success ? parsed.data[KEY] : undefined;
}

/** The session of a request whose context the middleware saw (TanStack's getRequest()). */
export function getRequestSession(request: Request): RequestSession | undefined {
  return sessionFromContext(Reflect.get(request, "context"));
}
