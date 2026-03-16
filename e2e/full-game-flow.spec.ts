import { expect, test } from "@playwright/test";
import {
  createGame,
  seedQuestions,
  joinPlayer,
} from "./helpers/game-setup";

// This test depends on the live Gemini API for question parsing.
test.skip(!!process.env.CI, "Skipped in CI — depends on live Gemini API");

test.describe("Full game flow — start to finish", () => {
  test("host creates game, player joins, plays 2 questions, sees final scores", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // 1. Setup: create game and seed 2 questions
    const { hostPage, gamePath } = await createGame(browser);
    await seedQuestions(hostPage);

    // 2. Player joins
    const { playerPage } = await joinPlayer(browser, gamePath, "E2E Champ");

    // Wait for host to see the player
    await expect(
      hostPage.getByText(/Players\s*\(\d+\/\d+\)/i)
    ).toBeVisible({ timeout: 10_000 });

    // 3. Host starts the game
    const startBtn = hostPage.getByRole("button", { name: /start game/i });
    await expect(startBtn).toBeEnabled({ timeout: 5_000 });
    await startBtn.click();

    // === Question 1 ===
    // Host starts first question
    const startQuestionBtn = hostPage.getByRole("button", {
      name: /start.*question|next.*question/i,
    });
    await expect(startQuestionBtn).toBeVisible({ timeout: 10_000 });
    await startQuestionBtn.click();

    // Player sees question and answers
    await expect(playerPage.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });

    const answerInput = playerPage.getByLabel(/answer/i);
    await answerInput.fill("4");
    await playerPage.getByRole("button", { name: /submit/i }).click();

    // Wait for results (auto-advance since only 1 player, or timer)
    // Host should show results or next question button
    await expect(
      hostPage.getByText(/results|correct answer|next.*question|start.*question/i)
    ).toBeVisible({ timeout: 35_000 });

    // === Question 2 ===
    // Host starts next question (if button available)
    const nextQuestionBtn = hostPage.getByRole("button", {
      name: /start.*question|next.*question/i,
    });
    // The button should appear after results processing
    await expect(nextQuestionBtn).toBeVisible({ timeout: 15_000 });
    await nextQuestionBtn.click();

    // Player answers question 2
    await expect(playerPage.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });

    // For MC questions, player might need to select an option instead of typing
    // Try filling the answer input if it exists
    const mcOption = playerPage.getByRole("button", { name: /^[A-D]\)/ });
    const numericInput = playerPage.getByLabel(/answer/i);

    if (await mcOption.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await mcOption.first().click();
    } else {
      await numericInput.fill("Blue");
      await playerPage.getByRole("button", { name: /submit/i }).click();
    }

    // 4. Game should end — verify Game Over screen with Final Scores
    await expect(
      hostPage.getByText(/Game Over/i)
    ).toBeVisible({ timeout: 35_000 });

    await expect(
      hostPage.getByText(/Final Scores/i)
    ).toBeVisible();

    // Verify the player's name appears in the final scores
    await expect(
      hostPage.getByText("E2E Champ")
    ).toBeVisible();
  });
});
