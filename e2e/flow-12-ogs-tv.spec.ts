import { expect, test, type Frame, type Page } from "@playwright/test";
import { createGame } from "./helpers/game-setup";

/**
 * Flow 12 (OGS TV seam): the TV page framed by a stand-in OGS TV launcher. ogs:start means the
 * launcher shows its own TV code, so the lobby drops its QR / join card; ogs:suspend (the game is
 * parked) silences every AudioContext, ogs:resume brings the sound back.
 */

/** Remember every AudioContext the page makes, so the test can read its state. */
const TRACK_AUDIO = `
  window.__ctxs = [];
  const Real = window.AudioContext;
  window.AudioContext = class extends Real {
    constructor(...a) { super(...a); window.__ctxs.push(this); }
  };
`;

const audioStates = (frame: Frame) =>
  frame.evaluate(() => {
    const ctxs: unknown = Reflect.get(window, "__ctxs");
    return Array.isArray(ctxs) ? ctxs.map((c: AudioContext) => c.state) : [];
  });

/** The launcher page framing /spectate/:id, as the OGS TV launcher does. */
async function frameTv(launcher: Page, tvUrl: string) {
  await launcher.setContent(
    `<iframe id="game" title="game" src="${tvUrl}" style="width:1280px;height:720px;border:0"></iframe>`,
  );
  const frame = await (await launcher.waitForSelector("#game")).contentFrame();
  if (!frame) throw new Error("no game frame");
  return frame;
}

const post = (launcher: Page, message: Record<string, unknown>) =>
  launcher.evaluate((m) => {
    const el = document.getElementById("game");
    if (el instanceof HTMLIFrameElement) el.contentWindow?.postMessage(m, "*");
  }, message);

const OGS_START = { type: "ogs:start", instanceId: "trivia-jam:e2e", mode: "new", roster: [], token: "tv-session", players: [] };

test.describe("Flow 12: the TV inside the OGS TV launcher", () => {
  test("ogs:start hides the TV's own QR and room code", async ({ browser, baseURL }) => {
    const { hostContext, gamePath } = await createGame(browser);
    const launcherContext = await browser.newContext({ viewport: { width: 1300, height: 760 } });
    const launcher = await launcherContext.newPage();
    try {
      const tv = await frameTv(launcher, `${baseURL}${gamePath.replace("/games/", "/spectate/")}`);
      const tvFrame = launcher.frameLocator("#game");
      await expect(tv.getByText("Waiting for game to start")).toBeVisible({ timeout: 15_000 });
      // Framed but not started yet (no ogs:start): the TV still shows how to join.
      await expect(tvFrame.getByTestId("qr-code-section")).toBeVisible();
      await expect(tvFrame.getByTestId("game-qr-code")).toBeVisible();

      await post(launcher, OGS_START);
      await expect(tvFrame.getByTestId("qr-code-section")).toHaveCount(0);
      await expect(tvFrame.getByTestId("game-qr-code")).toHaveCount(0);
      // Still the lobby: only the join card went away.
      await expect(tv.getByText("Waiting for game to start")).toBeVisible();
    } finally {
      await Promise.all([launcherContext.close(), hostContext.close()]);
    }
  });

  test("ogs:suspend silences every AudioContext and ogs:resume brings it back", async ({ browser, baseURL }) => {
    const { hostContext, gamePath } = await createGame(browser);
    const launcherContext = await browser.newContext({ viewport: { width: 1300, height: 760 } });
    await launcherContext.addInitScript(TRACK_AUDIO);
    const launcher = await launcherContext.newPage();
    try {
      const tv = await frameTv(launcher, `${baseURL}${gamePath.replace("/games/", "/spectate/")}`);
      await expect(tv.getByText("Waiting for game to start")).toBeVisible({ timeout: 15_000 });
      await post(launcher, OGS_START);
      // On the OGS cloud stream autoplay is allowed; a test browser may need the first press.
      await launcher.locator("#game").click({ position: { x: 20, y: 20 } });
      await expect.poll(() => audioStates(tv), { timeout: 10_000 }).toEqual(["running"]);

      await post(launcher, { type: "ogs:suspend" });
      await expect.poll(() => audioStates(tv)).toEqual(["suspended"]);
      // Parked stays parked: a press on the frame, the lobby music loop or a join does not wake it.
      await launcher.locator("#game").click({ position: { x: 20, y: 20 } });
      await launcher.waitForTimeout(500);
      expect(await audioStates(tv)).toEqual(["suspended"]);

      await post(launcher, { type: "ogs:resume" });
      await expect.poll(() => audioStates(tv)).toEqual(["running"]);
    } finally {
      await Promise.all([launcherContext.close(), hostContext.close()]);
    }
  });
});
