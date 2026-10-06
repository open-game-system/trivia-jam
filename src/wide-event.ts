/**
 * Wide events (canonical log lines) for Workers Logs, in the shape /sre-agent reads:
 * one object per unit of work (an HTTP request, a room action), errors through console.error with
 * error.{type,message,stack}. Ids go in fields, never in messages. Kids play this game: no names,
 * profile names, tokens or typed text ever reach a line (see SAFE_KEY below).
 */
export const SERVICE = "trivia-jam";

type Scalar = string | number | boolean | null;

export type WideEvent = {
  event: string;
  service: string;
  version: string;
  source: "server" | "client";
  outcome?: "ok" | "error";
  duration_ms?: number;
  request_id?: string;
  room_id?: string;
  session_id?: string;
  error?: { type: string; message: string; stack?: string };
  [context: string]: Scalar | undefined | { type: string; message: string; stack?: string };
};

export type Logger = { log: (line: unknown) => void; error: (line: unknown) => void };

export function errorFields(e: unknown): { type: string; message: string; stack?: string } {
  if (e instanceof Error) return e.stack ? { type: e.name, message: e.message, stack: e.stack } : { type: e.name, message: e.message };
  if (typeof e === "string") return { type: "NonError", message: e };
  return { type: "NonError", message: "Unknown error" };
}

/** "/games/<uuid>" → "/games/:id", so one route groups as one path. */
export function pathTemplate(path: string): string {
  return path
    .split("/")
    .map((part) => (/^[0-9a-f-]{16,}$/i.test(part) || /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(part) ? ":id" : part))
    .join("/");
}

// Keys that could carry a person's name, a token or something a player typed are dropped.
const UNSAFE_KEY = /name|token|email|text|answer|value|document|content|avatar|handle/i;

/**
 * Runs one unit of work and emits exactly one line for it: console.log when it succeeds,
 * console.error with error.{type,message,stack} when it throws (and the error is rethrown).
 * The work can add context with ctx.set({ phase, players, ... }).
 */
export async function withWideEvent<T>(
  base: WideEvent,
  work: (ctx: { set: (fields: Record<string, Scalar>) => void }) => Promise<T>,
  deps: { logger?: Logger; now?: () => number } = {},
): Promise<T> {
  const logger = deps.logger ?? console;
  const now = deps.now ?? (() => Date.now());
  const started = now();
  const context: Record<string, Scalar> = {};
  const set = (fields: Record<string, Scalar>) => {
    for (const [k, v] of Object.entries(fields)) if (!UNSAFE_KEY.test(k)) context[k] = v;
  };
  try {
    const result = await work({ set });
    logger.log({ ...base, ...context, outcome: "ok", duration_ms: now() - started });
    return result;
  } catch (e) {
    logger.error({ ...base, ...context, outcome: "error", duration_ms: now() - started, error: errorFields(e) });
    throw e;
  }
}

/** The deployed version (version_metadata binding), or "dev". */
export function versionOf(env: unknown): string {
  if (typeof env !== "object" || env === null) return "dev";
  const meta: unknown = Reflect.get(env, "CF_VERSION_METADATA");
  if (typeof meta !== "object" || meta === null) return "dev";
  const id: unknown = Reflect.get(meta, "id");
  return typeof id === "string" ? id : "dev";
}
