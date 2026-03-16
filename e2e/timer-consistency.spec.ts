import { expect, test } from "@playwright/test";
import {
  createGame,
  seedQuestions,
  joinPlayer,
} from "./helpers/game-setup";

// This test depends on the live Gemini API for question parsing.
test.skip(!!process.env.CI, "Skipped in CI — depends on live Gemini API");

test.describe("Timer consistency between host and player", () => {
  test("host and player timers show the same value within 3s tolerance", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    // Setup: create game, seed questions, join player
    const { hostPage, gamePath } = await createGame(browser);
    await seedQuestions(hostPage);
    const { playerPage } = await joinPlayer(browser, gamePath, "TimerTester");

    // Wait for host to see the player
    await expect(
      hostPage.getByText(/Players\s*\(\d+\/\d+\)/i)
    ).toBeVisible({ timeout: 10_000 });

    // Host starts the game
    const startBtn = hostPage.getByRole("button", { name: /start game/i });
    await expect(startBtn).toBeEnabled({ timeout: 5_000 });
    await startBtn.click();

    // Host starts the first question
    const nextQuestionBtn = hostPage.getByRole("button", {
      name: /start.*question|next.*question/i,
    });
    await expect(nextQuestionBtn).toBeVisible({ timeout: 10_000 });
    await nextQuestionBtn.click();

    // Wait for both timers to appear
    const hostTimer = hostPage.getByTestId("question-timer");
    const playerTimer = playerPage.getByTestId("question-timer");

    await expect(hostTimer).toBeVisible({ timeout: 10_000 });
    await expect(playerTimer).toBeVisible({ timeout: 10_000 });

    // Read both timer values and compare
    const hostTimerText = await hostTimer.textContent();
    const playerTimerText = await playerTimer.textContent();

    // Extract numeric seconds from timer text (e.g., "25s" → 25)
    const hostSeconds = parseInt(hostTimerText?.replace(/\D/g, "") ?? "0", 10);
    const playerSeconds = parseInt(
      playerTimerText?.replace(/\D/g, "") ?? "0",
      10
    );

    // Both timers should be within 3 seconds of each other
    expect(Math.abs(hostSeconds - playerSeconds)).toBeLessThanOrEqual(3);
  });
});
