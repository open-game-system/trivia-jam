import { expect, test, type Browser } from "@playwright/test";
import { hostPlayerRows, joinAndWait, openRoom, tvSeatName } from "./helpers/lobby";
import { fakeOgsWebView, gameClaims, signOgsToken, type OgsPerson } from "./helpers/ogs";

/**
 * Flow 13 (OGS phone seam): the player page inside a fake OGS app WebView whose `profile` store holds
 * an OGS profile and a game token signed with the test key. No name form: the phone joins at once,
 * and the server names the player from the verified token.
 *
 * Needs the server on the local key set the Playwright global setup serves:
 * `pnpm e2e:serve --var OGS_JWKS_URL:http://localhost:8833/.well-known/jwks.json`. CI's server
 * verifies against production OGS (wrangler.toml), so this flow runs locally only.
 */
test.skip(!!process.env.CI, "CI's server verifies OGS tokens against production OGS, not the test key set");

const DAD: OgsPerson = { id: "p_dad", handle: "dad", name: "Dad" };

/** A phone in the OGS app showing `shown` as its profile, holding a token signed for `claims`. */
async function phoneInOgsApp(browser: Browser, gamePath: string, shown: OgsPerson, claims: unknown, { watchForm = true } = {}) {
  const token = await signOgsToken(claims);
  const profile = { ...shown, avatar: `https://tv.opengame.org/art/trivia-jam/char-${shown.handle}.webp`, token };
  const context = await browser.newContext();
  await context.addInitScript(fakeOgsWebView({ ogs: { reported: [] }, profile: { status: "ready", profile } }));
  // The name form must never appear: watch for it from the first paint.
  if (watchForm) await context.addInitScript(() => {
    new MutationObserver(() => {
      if (document.querySelector("form input") || /Join Game|Your Name/i.test(document.body?.textContent ?? ""))
        Reflect.set(window, "__sawNameForm", true);
    }).observe(document, { childList: true, subtree: true, characterData: true });
  });
  const page = await context.newPage();
  await page.goto(gamePath);
  return { page, context };
}

test.describe("Flow 13: a phone in the OGS app joins under its OGS profile", () => {
  test("no name form; the player joins as the profile name on phone, host and TV", async ({ browser }) => {
    const room = await openRoom(browser);
    const phone = await phoneInOgsApp(browser, room.gamePath, DAD, gameClaims("trivia-jam", DAD));
    try {
      await expect(phone.page.getByRole("heading", { name: "Welcome, Dad!" })).toBeVisible({ timeout: 15_000 });
      expect(await phone.page.evaluate(() => Reflect.get(window, "__sawNameForm") ?? false)).toBe(false);
      await expect(phone.page.getByLabel(/your name/i)).toHaveCount(0);
      await expect(hostPlayerRows(room.hostPage, "Dad")).toHaveCount(1);
      await expect(tvSeatName(room.tvPage, "Dad")).toBeVisible();

      // A reload in the app keeps the one seat (no second "Dad").
      await phone.page.reload();
      await expect(phone.page.getByRole("heading", { name: "Welcome, Dad!" })).toBeVisible({ timeout: 15_000 });
      await expect(hostPlayerRows(room.hostPage, "Dad")).toHaveCount(1);
    } finally {
      await phone.context.close();
      await room.close();
    }
  });

  test("the name comes from the verified token, not from what the page sent", async ({ browser }) => {
    const room = await openRoom(browser);
    const phone = await phoneInOgsApp(browser, room.gamePath, { ...DAD, name: "Mallory" }, gameClaims("trivia-jam", DAD));
    try {
      await expect(phone.page.getByRole("heading", { name: "Welcome, Dad!" })).toBeVisible({ timeout: 15_000 });
      await expect(hostPlayerRows(room.hostPage, "Dad")).toHaveCount(1);
      await expect(hostPlayerRows(room.hostPage, "Mallory")).toHaveCount(0);
    } finally {
      await phone.context.close();
      await room.close();
    }
  });

  test("a token for another game does not name the player: the page's name stands, like a typed one", async ({ browser }) => {
    const room = await openRoom(browser);
    const phone = await phoneInOgsApp(browser, room.gamePath, { ...DAD, name: "Guest" }, gameClaims("story-nook", DAD));
    try {
      await expect(phone.page.getByRole("heading", { name: "Welcome, Guest!" })).toBeVisible({ timeout: 15_000 });
      await expect(hostPlayerRows(room.hostPage, "Guest")).toHaveCount(1);
      await expect(hostPlayerRows(room.hostPage, "Dad")).toHaveCount(0);
    } finally {
      await phone.context.close();
      await room.close();
    }
  });

  test("a player already has the OGS name: the phone gets the name form instead, and joins as what it types", async ({ browser }) => {
    const room = await openRoom(browser);
    const other = await joinAndWait(browser, room.gamePath, "Dad");
    const phone = await phoneInOgsApp(browser, room.gamePath, DAD, gameClaims("trivia-jam", DAD), { watchForm: false });
    try {
      await expect(phone.page.getByText(/Dad is already taken/i)).toBeVisible({ timeout: 15_000 });
      await phone.page.getByLabel(/your name/i).fill("Papa");
      await phone.page.getByRole("button", { name: "Join Game" }).click();

      await expect(phone.page.getByRole("heading", { name: "Welcome, Papa!" })).toBeVisible({ timeout: 15_000 });
      await expect(hostPlayerRows(room.hostPage, "Papa")).toHaveCount(1);
      await expect(hostPlayerRows(room.hostPage, "Dad")).toHaveCount(1);
    } finally {
      await phone.context.close();
      await other.playerPage.context().close();
      await room.close();
    }
  });
});
