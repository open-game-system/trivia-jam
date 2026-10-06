import { describe, expect, it, vi } from "vitest";
import { handleEvents } from "./events-route";
import { createTelemetry, type KV } from "./telemetry";
import { SERVICE } from "./wide-event";
import { postEvents } from "./client-telemetry";

/** The real path: a thrown error on the client is posted to the Worker's /events route and logged once. */
describe("client error -> Worker -> Workers Logs (seam)", () => {
  it("emits exactly one console.error with error.type/message, source client, and no names", async () => {
    const store = new Map<string, string>();
    const kv: KV = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v), removeItem: (k) => void store.delete(k) };
    const telemetry = createTelemetry({ kv, version: "test", prefix: "trivia-jam" });

    // A thrown error, plus context a careless caller might pass (a player's name must not survive).
    telemetry.error(new TypeError("Cannot read properties of undefined"), { screen: "player", playerName: "Juneau" });

    const log = vi.fn();
    const error = vi.fn();
    const worker = (req: Request) => handleEvents(req, { service: SERVICE, logger: { log, error } });
    const sent = await telemetry.flush((events) => postEvents(events, (url, init) => worker(new Request(`https://triviajam.tv${url}`, init))));

    expect(sent).toBe(true);
    expect(error).toHaveBeenCalledTimes(1);
    const line: unknown = error.mock.calls[0]?.[0];
    expect(line).toMatchObject({
      event: "client.error",
      service: SERVICE,
      source: "client",
      outcome: "error",
      error: { type: "TypeError", message: "Cannot read properties of undefined" },
      screen: "player",
    });
    expect(JSON.stringify(line)).not.toContain("Juneau");
  });
});
