import { expect, test } from "@playwright/test";
import {
  createGame,
  seedQuestions,
  joinPlayer,
} from "./helpers/game-setup";

// This test depends on the live Gemini API for question parsing.
test.skip(!!process.env.CI, "Skipped in CI — depends on live Gemini API");

test.describe("Auto-advance when all players submit", () => {
  test("question ends immediately when all players submit answers", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    // Setup: create game, seed questions, join 2 players
    const { hostPage, gamePath } = await createGame(browser);
    await seedQuestions(hostPage);
    const { playerPage: player1Page } = await joinPlayer(
      browser,
      gamePath,
      "Player1"
    );
    const { playerPage: player2Page } = await joinPlayer(
      browser,
      gamePath,
      "Player2"
    );

    // Wait for host to see both players
    await expect(hostPage.getByText(/Players\s*\(2\/\d+\)/i)).toBeVisible({
      timeout: 15_000,
    });

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

    // Wait for both players to see the question
    await expect(player1Page.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });
    await expect(player2Page.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });

    // Both players submit answers quickly
    const answerInput1 = player1Page.getByLabel(/answer/i);
    const answerInput2 = player2Page.getByLabel(/answer/i);

    await answerInput1.fill("42");
    await player1Page.getByRole("button", { name: /submit/i }).click();

    await answerInput2.fill("42");
    await player2Page.getByRole("button", { name: /submit/i }).click();

    // The question should end immediately — results or next question prep
    // should appear within 5s, not waiting for the full timer countdown.
    // Look for results indicators on the host page.
    await expect(
      hostPage.getByText(
        /results|scores|next.*question|start.*question|correct answer/i
      )
    ).toBeVisible({ timeout: 5_000 });
  });
});
