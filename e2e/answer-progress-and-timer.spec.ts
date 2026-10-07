import { expect, test } from "@playwright/test";
import {
  createGame,
  seedQuestions,
  joinPlayer,
  openSpectateView,
} from "./helpers/game-setup";

// This test depends on the live Gemini API for question parsing.
test.skip(!!process.env.CI, "Skipped in CI — depends on live Gemini API");

test.describe("Answer progress and timer behavior", () => {
  test("timer disappears on all views when question ends", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    const { hostPage, gamePath } = await createGame(browser);
    await seedQuestions(hostPage);
    const { playerPage } = await joinPlayer(browser, gamePath, "TimerTest");
    const { spectatePage } = await openSpectateView(browser, gamePath);

    // Wait for host to see the player
    await expect(
      hostPage.getByText(/Players\s*\(\d+\/\d+\)/i)
    ).toBeVisible({ timeout: 10_000 });

    // Start game + first question
    const startBtn = hostPage.getByRole("button", { name: /start game/i });
    await expect(startBtn).toBeEnabled({ timeout: 5_000 });
    await startBtn.click();

    const nextQuestionBtn = hostPage.getByRole("button", {
      name: /start.*question|next.*question/i,
    });
    await expect(nextQuestionBtn).toBeVisible({ timeout: 10_000 });
    await nextQuestionBtn.click();

    // All three views should show timer
    const hostTimer = hostPage.getByTestId("question-timer");
    const playerTimer = playerPage.getByTestId("question-timer");
    const spectateTimer = spectatePage.getByTestId("question-timer");

    await expect(hostTimer).toBeVisible({ timeout: 10_000 });
    await expect(playerTimer).toBeVisible({ timeout: 10_000 });
    await expect(spectateTimer).toBeVisible({ timeout: 10_000 });

    // Player submits answer (only 1 player, so auto-advance triggers)
    await playerPage.getByLabel(/answer/i).fill("4");
    await playerPage.getByRole("button", { name: /submit/i }).click();

    // After auto-advance, timers should disappear on all views
    // Host timer should be gone (replaced by results)
    await expect(hostTimer).not.toBeVisible({ timeout: 10_000 });

    // Player timer should be gone
    await expect(playerTimer).not.toBeVisible({ timeout: 10_000 });

    // Spectate timer should be gone
    await expect(spectateTimer).not.toBeVisible({ timeout: 10_000 });
  });
});
