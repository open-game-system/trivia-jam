import { expect, test } from "@playwright/test";
import {
  createGame,
  seedQuestions,
  joinPlayer,
} from "./helpers/game-setup";

// This test depends on the live Gemini API for question parsing.
test.skip(!!process.env.CI, "Skipped in CI — depends on live Gemini API");

test.describe("Host ends game early", () => {
  test("host can end game after question 1 and both views show Game Over with scores", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // 1. Setup: create game, seed 2 questions, join 1 player
    const { hostPage, gamePath } = await createGame(browser);
    await seedQuestions(hostPage);
    const { playerPage } = await joinPlayer(browser, gamePath, "EarlyEnder");

    // Wait for host to see the player in the lobby
    await expect(
      hostPage.getByText(/Players\s*\(\d+\/\d+\)/i)
    ).toBeVisible({ timeout: 10_000 });

    // 2. Host starts the game
    const startBtn = hostPage.getByRole("button", { name: /start game/i });
    await expect(startBtn).toBeEnabled({ timeout: 5_000 });
    await startBtn.click();

    // 3. Host starts question 1
    const startQuestionBtn = hostPage.getByRole("button", {
      name: /start.*question|next.*question/i,
    });
    await expect(startQuestionBtn).toBeVisible({ timeout: 10_000 });
    await startQuestionBtn.click();

    // 4. Player sees the timer and submits an answer
    await expect(playerPage.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });

    await playerPage.getByLabel(/answer/i).fill("4");
    await playerPage.getByRole("button", { name: /submit/i }).click();

    // 5. Wait for question results to appear on host before ending
    await expect(
      hostPage.getByText(/results|correct answer|next.*question|start.*question/i)
    ).toBeVisible({ timeout: 35_000 });

    // 6. Host clicks "End Game" instead of continuing to question 2
    const endGameBtn = hostPage.getByRole("button", {
      name: /end.*game|finish/i,
    });
    await expect(endGameBtn).toBeVisible({ timeout: 10_000 });
    await endGameBtn.click();

    // 7. Host sees Game Over screen with Final Scores
    await expect(hostPage.getByText(/Game Over/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(hostPage.getByText(/Final Scores/i)).toBeVisible();

    // 8. Player also sees Game Over screen
    await expect(playerPage.getByText(/Game Over/i)).toBeVisible({
      timeout: 15_000,
    });

    // 9. Player name appears in final scores on the host view
    await expect(hostPage.getByText("EarlyEnder")).toBeVisible();
  });
});
