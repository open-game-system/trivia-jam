import { expect, test } from "@playwright/test";
import {
  createGame,
  seedQuestions,
  joinPlayer,
  openSpectateView,
} from "./helpers/game-setup";

// This test validates that the E2E helpers work correctly.
// It depends on the live Gemini API for question parsing.
test.skip(!!process.env.CI, "Skipped in CI — depends on live Gemini API");

test.describe("E2E game-setup helpers", () => {
  test("createGame + seedQuestions + joinPlayer + openSpectateView", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    // 1. Host creates a game
    const { hostPage, gamePath } = await createGame(browser);

    // 2. Host seeds questions
    await seedQuestions(hostPage);

    // Verify parsed questions appear
    await expect(hostPage.getByTestId("parsed-question-1")).toBeVisible();
    await expect(hostPage.getByTestId("parsed-question-2")).toBeVisible();

    // 3. Player joins the game
    const { playerPage } = await joinPlayer(browser, gamePath, "TestPlayer");

    // Player should see waiting/lobby state
    await expect(
      playerPage.getByText(/waiting for host|players|empty slot/i)
    ).toBeVisible({ timeout: 15_000 });

    // Host should see the player
    await expect(
      hostPage.getByText(/Players\s*\(\d+\/\d+\)/i)
    ).toBeVisible({ timeout: 10_000 });

    // 4. Spectate view opens
    const { spectatePage } = await openSpectateView(browser, gamePath);

    // Spectate page should load (verify it shows something game-related)
    await expect(spectatePage).toHaveURL(/\/spectate\//);
  });
});
