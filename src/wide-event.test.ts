import { describe, expect, it, vi } from "vitest";
import { errorFields, pathTemplate, withWideEvent, type Logger } from "./wide-event";

const capture = () => {
  const log = vi.fn();
  const error = vi.fn();
  const logger: Logger = { log, error };
  return { logger, log, error };
};

describe("errorFields", () => {
  it("takes type, message and stack from an Error", () => {
    const e = new TypeError("Cannot read properties of undefined");
    expect(errorFields(e)).toMatchObject({ type: "TypeError", message: "Cannot read properties of undefined" });
    expect(errorFields(e).stack).toContain("TypeError");
  });

  it("names a thrown non-Error", () => {
    expect(errorFields("boom")).toEqual({ type: "NonError", message: "boom" });
    expect(errorFields({ nope: 1 })).toEqual({ type: "NonError", message: "Unknown error" });
  });
});

describe("pathTemplate", () => {
  it("replaces game ids so one route is one path", () => {
    expect(pathTemplate("/games/2b1f6c1e-5a0e-4b8f-9b6d-1c2d3e4f5a6b")).toBe("/games/:id");
    expect(pathTemplate("/spectate/2b1f6c1e-5a0e-4b8f-9b6d-1c2d3e4f5a6b")).toBe("/spectate/:id");
    expect(pathTemplate("/api/game/abc123def456abc123def456")).toBe("/api/game/:id");
    expect(pathTemplate("/")).toBe("/");
  });
});

describe("withWideEvent", () => {
  const base = { event: "room.action", service: "trivia-jam", version: "v1", source: "server", room_id: "g1", action: "SUBMIT_ANSWER" } as const;

  it("emits exactly one ok line with the duration", async () => {
    const { logger, log, error } = capture();
    let t = 1000;
    const result = await withWideEvent(base, async () => "done", { logger, now: () => (t += 25) });
    expect(result).toBe("done");
    expect(error).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toEqual({ ...base, outcome: "ok", duration_ms: 25 });
  });

  it("emits exactly one console.error line with error.type/message and rethrows", async () => {
    const { logger, log, error } = capture();
    await expect(
      withWideEvent(base, async () => {
        throw new RangeError("Question not found");
      }, { logger, now: () => 0 }),
    ).rejects.toThrow("Question not found");
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
    const line: unknown = error.mock.calls[0]?.[0];
    expect(line).toMatchObject({ ...base, outcome: "error", error: { type: "RangeError", message: "Question not found" } });
  });

  it("lets the work add context fields (never names) to its own line", async () => {
    const { logger, log } = capture();
    await withWideEvent(base, async (ctx) => {
      ctx.set({ players: 3, phase: "questionActive" });
    }, { logger, now: () => 0 });
    expect(log.mock.calls[0]?.[0]).toMatchObject({ players: 3, phase: "questionActive" });
  });

  it("refuses context keys that could carry names or typed text", async () => {
    const { logger, log } = capture();
    await withWideEvent(base, async (ctx) => {
      ctx.set({ playerName: "Sam", name: "Sam", token: "t", answer_text: "x", players: 2 });
    }, { logger, now: () => 0 });
    const line = log.mock.calls[0]?.[0];
    expect(line).toMatchObject({ players: 2 });
    expect(JSON.stringify(line)).not.toContain("Sam");
    expect(JSON.stringify(line)).not.toContain('"t"');
  });
});
