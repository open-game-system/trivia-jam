import { expect, test, type Page } from "@playwright/test";
import { createGame, seedQuestions } from "./helpers/game-setup";
import { joinAndWait } from "./helpers/lobby";
import { Q1, startFirstQuestion } from "./helpers/play";

/**
 * Flow 14 (TV audio): with ?record the TV exposes its master mix as window.__tvAudioTap(). During a
 * question the mix is not silent (the question stamp and the think bed). The test meters the tap with
 * its own AnalyserNode: the peak sample level since the last reset.
 */

/** Starts metering the tap; the TV's press resumes the meter's context with the game's. */
const startMeter = (tv: Page) =>
  tv.evaluate(() => {
    const tap: unknown = Reflect.get(window, "__tvAudioTap");
    if (typeof tap !== "function") throw new Error("no __tvAudioTap (is ?record on?)");
    const stream: unknown = tap();
    if (!(stream instanceof MediaStream)) throw new Error("__tvAudioTap gave no MediaStream");
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    const meter = { peak: 0, ctx };
    Reflect.set(window, "__meter", meter);
    window.addEventListener("pointerdown", () => void ctx.resume());
    setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      for (const v of buf) meter.peak = Math.max(meter.peak, Math.abs(v));
    }, 20);
  });

const meter = (tv: Page) =>
  tv.evaluate(() => {
    const m: unknown = Reflect.get(window, "__meter");
    if (typeof m !== "object" || m === null) return { peak: 0, state: "none" };
    const peak: unknown = Reflect.get(m, "peak");
    const ctx: unknown = Reflect.get(m, "ctx");
    return { peak: typeof peak === "number" ? peak : 0, state: ctx instanceof AudioContext ? ctx.state : "none" };
  });

const resetMeter = (tv: Page) => tv.evaluate(() => Reflect.set(Reflect.get(window, "__meter") ?? {}, "peak", 0));

test.describe("Flow 14: the TV's sound, through the ?record tap", () => {
  test("the tap carries a non-silent mix during a question", async ({ browser }) => {
    const { hostPage, hostContext, gamePath } = await createGame(browser);
    await seedQuestions(hostPage);
    const tvContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const tv = await tvContext.newPage();
    const contexts = [hostContext, tvContext];
    try {
      await tv.goto(`${gamePath.replace("/games/", "/spectate/")}?record`);
      await expect(tv.getByText("Waiting for game to start")).toBeVisible({ timeout: 15_000 });
      await startMeter(tv);
      // Autoplay is allowed on the cloud stream and in the recorder; a test browser may need a press.
      await tv.mouse.click(10, 10);
      await expect.poll(async () => (await meter(tv)).state, { timeout: 10_000 }).toBe("running");

      const player = await joinAndWait(browser, gamePath, "Ada");
      contexts.push(player.playerContext);
      await startFirstQuestion({ gamePath, hostPage, tvPage: tv, contexts, close: async () => {} });
      await expect(tv.getByText(Q1)).toBeVisible({ timeout: 15_000 });
      await resetMeter(tv);
      // Comfortably audible (about -26 dBFS or louder), not just dither.
      await expect.poll(async () => (await meter(tv)).peak, { timeout: 10_000 }).toBeGreaterThan(0.05);
    } finally {
      await Promise.all(contexts.map((c) => c.close()));
    }
  });
});
