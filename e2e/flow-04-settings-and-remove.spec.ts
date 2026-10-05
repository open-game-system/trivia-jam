import { expect, test, type Page } from "@playwright/test";
import {
  hostPlayerRows,
  hostPlayersHeading,
  joinAndWait,
  openRoom,
  tvSeatName,
} from "./helpers/lobby";

// Flow 4: the host changes settings (answer time, max players) and the TV/host reflect them;
// the host removes a player. Host + TV + players at once, so a Playwright spec.

async function saveSettings(hostPage: Page, { seconds, maxPlayers }: { seconds: number; maxPlayers: number }) {
  await hostPage.getByRole("button", { name: "Settings" }).click();
  const drawer = hostPage.getByRole("dialog", { name: "Game Settings" });
  await expect(drawer).toBeVisible();
  await drawer.getByLabel("Answer Time Window").fill(String(seconds));
  await drawer.getByLabel("Max Players").selectOption(String(maxPlayers));
  await drawer.getByRole("button", { name: "Save Changes" }).click();
  await expect(drawer).toBeHidden();
}

/** The number on the TV's timer dial, from its "N seconds left" label. */
async function tvSecondsLeft(tvPage: Page) {
  const label = await tvPage.getByLabel(/seconds left/).getAttribute("aria-label");
  return Number(label?.match(/^(\d+) seconds left$/)?.[1]);
}

test.describe("Flow 4: settings and removing players", () => {
  test("new answer time and player limit show on the host and run the TV's timer", async ({ browser }) => {
    const room = await openRoom(browser, { withQuestions: true });
    try {
      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      room.contexts.push(ada.playerContext);
      await expect(hostPlayersHeading(room.hostPage, 1, 30)).toBeVisible();

      await saveSettings(room.hostPage, { seconds: 8, maxPlayers: 10 });

      await expect(hostPlayersHeading(room.hostPage, 1, 10)).toBeVisible();
      // Reopening shows what was saved, not the defaults.
      await room.hostPage.getByRole("button", { name: "Settings" }).click();
      const drawer = room.hostPage.getByRole("dialog", { name: "Game Settings" });
      await expect(drawer.getByLabel("Answer Time Window")).toHaveValue("8");
      await expect(drawer.getByLabel("Max Players")).toHaveValue("10");
      await drawer.getByRole("button", { name: "Cancel" }).click();
      await expect(drawer).toBeHidden();

      // A reload of the host keeps the saved settings (they live in the game, not the page).
      await room.hostPage.reload();
      await expect(hostPlayersHeading(room.hostPage, 1, 10)).toBeVisible({ timeout: 15_000 });

      await room.hostPage.getByRole("button", { name: "Start Game" }).click();
      await room.hostPage.getByRole("button", { name: "Start First Question" }).click();

      // The TV's dial counts down from the new 8 seconds, not the default 25.
      await expect(room.tvPage.getByLabel(/seconds left/)).toBeVisible({ timeout: 15_000 });
      const shown = await tvSecondsLeft(room.tvPage);
      expect(shown).toBeGreaterThan(0);
      expect(shown).toBeLessThanOrEqual(8);
      await expect(room.hostPage.getByTestId("question-timer")).toHaveText(/^[1-8]s$/);

      // And the server ends the question on the new time: nobody answered, results within ~8s.
      await expect(room.hostPage.getByText("No one answered this question")).toBeVisible({ timeout: 12_000 });
    } finally {
      await room.close();
    }
  });

  test("the host removes a player: gone from host and TV, their phone is back at the name form", async ({ browser }) => {
    const room = await openRoom(browser);
    try {
      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      const ben = await joinAndWait(browser, room.gamePath, "Ben");
      room.contexts.push(ada.playerContext, ben.playerContext);
      await expect(hostPlayersHeading(room.hostPage, 2)).toBeVisible();
      await expect(tvSeatName(room.tvPage, "Ben")).toBeVisible();

      await room.hostPage.getByRole("button", { name: "Remove Ben" }).click();

      await expect(hostPlayersHeading(room.hostPage, 1)).toBeVisible();
      await expect(hostPlayerRows(room.hostPage, "Ben")).toHaveCount(0);
      await expect(hostPlayerRows(room.hostPage, "Ada")).toHaveCount(1);
      await expect(tvSeatName(room.tvPage, "Ben")).toHaveCount(0);
      await expect(tvSeatName(room.tvPage, "Ada")).toBeVisible();
      await expect(room.tvPage.getByText("Players 1/10")).toBeVisible();
      await expect(ben.playerPage.getByRole("heading", { name: "Join Game" })).toBeVisible();
      await expect(ada.playerPage.getByRole("heading", { name: "Welcome, Ada!" })).toBeVisible();

      // Ben can come back in.
      await ben.playerPage.getByLabel("Your Name").fill("Ben");
      await ben.playerPage.getByRole("button", { name: "Join Game" }).click();
      await expect(ben.playerPage.getByRole("heading", { name: "Welcome, Ben!" })).toBeVisible({ timeout: 15_000 });
      await expect(hostPlayersHeading(room.hostPage, 2)).toBeVisible();
    } finally {
      await room.close();
    }
  });
});
