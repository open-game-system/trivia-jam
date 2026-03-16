import { expect, test } from "@playwright/test";
import {
  createGame,
  seedQuestions,
  joinPlayer,
} from "./helpers/game-setup";

// This test depends on the live Gemini API for question parsing.
test.skip(!!process.env.CI, "Skipped in CI — depends on live Gemini API");

test.describe("Multiple players competing", () => {
  test("3 players join, play 2 questions, and all appear on the final scoreboard", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // 1. Setup: create game, seed 2 questions, join 3 players
    const { hostPage, gamePath } = await createGame(browser);
    await seedQuestions(hostPage);

    const { playerPage: alicePage } = await joinPlayer(browser, gamePath, "Alice");
    const { playerPage: bobPage } = await joinPlayer(browser, gamePath, "Bob");
    const { playerPage: charliePage } = await joinPlayer(browser, gamePath, "Charlie");

    // Wait for host to see all 3 players in the lobby
    await expect(hostPage.getByText(/Players\s*\(3\/\d+\)/i)).toBeVisible({
      timeout: 15_000,
    });

    // 2. Host starts the game
    const startBtn = hostPage.getByRole("button", { name: /start game/i });
    await expect(startBtn).toBeEnabled({ timeout: 5_000 });
    await startBtn.click();

    // === Question 1 (numeric: "What is 2 + 2?", answer: 4) ===

    // 3. Host starts question 1
    const startQuestionBtn = hostPage.getByRole("button", {
      name: /start.*question|next.*question/i,
    });
    await expect(startQuestionBtn).toBeVisible({ timeout: 10_000 });
    await startQuestionBtn.click();

    // 4. All 3 players see the question timer
    await expect(alicePage.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });
    await expect(bobPage.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });
    await expect(charliePage.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });

    // 5. Each player submits a different numeric answer
    await alicePage.getByLabel(/answer/i).fill("4");
    await alicePage.getByRole("button", { name: /submit/i }).click();

    await bobPage.getByLabel(/answer/i).fill("5");
    await bobPage.getByRole("button", { name: /submit/i }).click();

    await charliePage.getByLabel(/answer/i).fill("3");
    await charliePage.getByRole("button", { name: /submit/i }).click();

    // 6. Host sees results with all 3 players listed
    await expect(
      hostPage.getByText(/results|correct answer|next.*question|start.*question/i)
    ).toBeVisible({ timeout: 35_000 });

    await expect(hostPage.getByText("Alice")).toBeVisible({ timeout: 10_000 });
    await expect(hostPage.getByText("Bob")).toBeVisible();
    await expect(hostPage.getByText("Charlie")).toBeVisible();

    // === Question 2 (MC: "What color is the sky on a clear day?") ===

    // 7. Host starts question 2
    const nextQuestionBtn = hostPage.getByRole("button", {
      name: /start.*question|next.*question/i,
    });
    await expect(nextQuestionBtn).toBeVisible({ timeout: 15_000 });
    await nextQuestionBtn.click();

    // 8. All 3 players see the timer for question 2
    await expect(alicePage.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });
    await expect(bobPage.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });
    await expect(charliePage.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });

    // 9. Each player picks an MC option (or fills numeric if needed)
    // Helper: click first MC button if available, otherwise fill text input
    async function answerQuestion2(playerPage: typeof alicePage, fallbackAnswer: string) {
      const mcOption = playerPage.getByRole("button", { name: /^[A-D]\)/ });
      if (await mcOption.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await mcOption.first().click();
      } else {
        await playerPage.getByLabel(/answer/i).fill(fallbackAnswer);
        await playerPage.getByRole("button", { name: /submit/i }).click();
      }
    }

    await answerQuestion2(alicePage, "Blue");
    await answerQuestion2(bobPage, "Blue");
    await answerQuestion2(charliePage, "Blue");

    // 10. Game ends — verify final scoreboard on host shows all 3 players
    await expect(hostPage.getByText(/Game Over/i)).toBeVisible({
      timeout: 35_000,
    });
    await expect(hostPage.getByText(/Final Scores/i)).toBeVisible();

    await expect(hostPage.getByText("Alice")).toBeVisible();
    await expect(hostPage.getByText("Bob")).toBeVisible();
    await expect(hostPage.getByText("Charlie")).toBeVisible();
  });
});
