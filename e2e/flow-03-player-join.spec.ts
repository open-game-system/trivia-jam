import { expect, test } from "@playwright/test";
import {
  hostPlayerRows,
  hostPlayersHeading,
  joinAndWait,
  openRoom,
  tvSeatName,
} from "./helpers/lobby";

// Flow 3: a player joins from the game link with a name; host and TV both show the player;
// duplicate joins don't create duplicate players. Three devices at once, so a Playwright spec
// (the e2e framework drives one tab per test; see docs/E2E_TEST_IDEAS.md).

test.describe("Flow 3: player joins from the game link", () => {
  test("the joined player shows on the host phone and the TV", async ({ browser }) => {
    const room = await openRoom(browser);
    try {
      await expect(hostPlayersHeading(room.hostPage, 0)).toBeVisible();
      await expect(room.tvPage.getByText("Waiting for players", { exact: true })).toBeVisible();

      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      room.contexts.push(ada.playerContext);

      await expect(hostPlayersHeading(room.hostPage, 1)).toBeVisible();
      await expect(hostPlayerRows(room.hostPage, "Ada")).toHaveCount(1);
      await expect(tvSeatName(room.tvPage, "Ada")).toBeVisible();
      await expect(room.tvPage.getByText("1 player", { exact: true })).toBeVisible();

      const ben = await joinAndWait(browser, room.gamePath, "Ben");
      room.contexts.push(ben.playerContext);

      await expect(hostPlayersHeading(room.hostPage, 2)).toBeVisible();
      await expect(tvSeatName(room.tvPage, "Ben")).toBeVisible();
      await expect(room.tvPage.getByText("2 players", { exact: true })).toBeVisible();
    } finally {
      await room.close();
    }
  });

  test("a name the form rejects never reaches the host", async ({ browser }) => {
    const room = await openRoom(browser);
    const player = await browser.newContext();
    try {
      const page = await player.newPage();
      await page.goto(room.gamePath);
      await page.getByLabel("Your Name").fill("Ada!");
      await page.getByRole("button", { name: "Join Game" }).click();

      await expect(page.getByRole("alert")).toHaveText(
        "Name can only contain letters, numbers and spaces",
      );
      await expect(hostPlayersHeading(room.hostPage, 0)).toBeVisible();
    } finally {
      await player.close();
      await room.close();
    }
  });

  test("joining twice from the same phone (two tabs) seats the player once", async ({ browser }) => {
    const room = await openRoom(browser);
    const phone = await browser.newContext();
    try {
      const [tabA, tabB] = [await phone.newPage(), await phone.newPage()];
      for (const tab of [tabA, tabB]) {
        await tab.goto(room.gamePath);
        await tab.getByLabel("Your Name").fill("Ada");
      }
      // Resolve both buttons first, then press them together: each tab sends its JOIN_GAME
      // before the other's join comes back (a plain click on tab B would wait out the form
      // disappearing once tab A's join lands).
      const buttons = [
        await tabA.getByRole("button", { name: "Join Game" }).elementHandle(),
        await tabB.getByRole("button", { name: "Join Game" }).elementHandle(),
      ];
      await Promise.all(buttons.map((b) => b?.evaluate((el) => el instanceof HTMLElement && el.click())));

      await expect(tabA.getByRole("heading", { name: "Welcome, Ada!" })).toBeVisible({ timeout: 15_000 });
      await expect(tabB.getByRole("heading", { name: "Welcome, Ada!" })).toBeVisible({ timeout: 15_000 });
      await expect(hostPlayersHeading(room.hostPage, 1)).toBeVisible();
      await expect(hostPlayerRows(room.hostPage, "Ada")).toHaveCount(1);
      await expect(tvSeatName(room.tvPage, "Ada")).toHaveCount(1);
      await expect(room.tvPage.getByText("1 player", { exact: true })).toBeVisible();
    } finally {
      await phone.close();
      await room.close();
    }
  });

  test("reloading after joining keeps one seat and skips the name form", async ({ browser }) => {
    const room = await openRoom(browser);
    try {
      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      room.contexts.push(ada.playerContext);

      await ada.playerPage.reload();
      await expect(ada.playerPage.getByRole("heading", { name: "Welcome, Ada!" })).toBeVisible({
        timeout: 15_000,
      });
      await expect(ada.playerPage.getByLabel("Your Name")).toHaveCount(0);
      await expect(hostPlayersHeading(room.hostPage, 1)).toBeVisible();
      await expect(hostPlayerRows(room.hostPage, "Ada")).toHaveCount(1);
    } finally {
      await room.close();
    }
  });
});
