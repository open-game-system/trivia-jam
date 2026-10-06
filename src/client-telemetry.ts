/**
 * Browser wiring for the telemetry buffer (src/telemetry.ts): global errors, session lifecycle and
 * flushing to this Worker's POST /events, where each event becomes a wide event in Workers Logs
 * (src/events-route.ts) for /sre-agent. Never throws; never sends names or typed text — callers pass
 * ids, enums and counts only.
 */
import { createTelemetry, type ClientEvent, type EventData, type KV, type Telemetry } from "./telemetry";

export const EVENTS_PATH = "/events";
const VERSION = "web-1";

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** POSTs a batch to /events; true only on a 2xx. */
export async function postEvents(events: ClientEvent[], fetchFn: FetchLike): Promise<boolean> {
  try {
    const res = await fetchFn(EVENTS_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

let active: Telemetry | null = null;

/** Report an error from app code (an error boundary, a caught failure). No-op until installed. */
export function reportError(err: unknown, data: EventData = {}, type?: string) {
  active?.error(err, data, type);
}

function storage(): KV | null {
  try {
    const s = window.localStorage;
    s.setItem("trivia-jam:probe", "1");
    s.removeItem("trivia-jam:probe");
    return s;
  } catch {
    return null;
  }
}

/** Automated runs (Playwright, the evidence recorder, ?test) must not file issues. */
function isAutomated(): boolean {
  const params = new URLSearchParams(window.location.search);
  return navigator.webdriver === true || params.has("test") || params.has("record");
}

/** Installs once per page. `screen` is "tv" | "phone" (an enum, never a name). */
export function installTelemetry(screen: string): () => void {
  if (typeof window === "undefined" || active || isAutomated()) return () => {};
  const kv = storage();
  if (!kv) return () => {};
  const t = createTelemetry({ kv, version: VERSION, prefix: "trivia-jam" });
  active = t;
  const flush = () => void t.flush((events) => postEvents(events, (url, init) => fetch(url, init)));

  const onError = (e: ErrorEvent) => t.error(e.error ?? e.message, { screen });
  const onRejection = (e: PromiseRejectionEvent) => t.error(e.reason, { screen });
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      // iPadOS kills background tabs: that is not a crash.
      t.sessionEnd();
      flush();
    } else t.heartbeat();
  };
  const onPageHide = () => {
    t.sessionEnd();
    flush();
  };

  t.sessionStart();
  addEventListener("error", onError);
  addEventListener("unhandledrejection", onRejection);
  document.addEventListener("visibilitychange", onVisibility);
  addEventListener("pagehide", onPageHide);
  addEventListener("online", flush);
  const heartbeat = window.setInterval(() => t.heartbeat(), 20_000);
  const sender = window.setInterval(flush, 30_000);
  flush();

  return () => {
    removeEventListener("error", onError);
    removeEventListener("unhandledrejection", onRejection);
    document.removeEventListener("visibilitychange", onVisibility);
    removeEventListener("pagehide", onPageHide);
    removeEventListener("online", flush);
    window.clearInterval(heartbeat);
    window.clearInterval(sender);
    active = null;
  };
}
