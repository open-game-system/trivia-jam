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
    await expect(hostPage.getByRole("heading", { name: "Players (3/30)" })).toBeVisible({
      timeout: 15_000,
    });

    // 2. Host starts the game
    const startBtn = hostPage.getByRole("button", { name: "Start Game" });
    await expect(startBtn).toBeEnabled({ timeout: 5_000 });
    await startBtn.click();

    // === Question 1 (numeric: "What is 2 + 2?", answer: 4) ===

    // 3. Host starts question 1
    const startQuestionBtn = hostPage.getByRole("button", {
      name: "Start First Question",
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
    await alicePage.getByLabel("Your Answer").fill("4");
    await alicePage.getByRole("button", { name: "Submit answer" }).click();

    await bobPage.getByLabel("Your Answer").fill("5");
    await bobPage.getByRole("button", { name: "Submit answer" }).click();

    await charliePage.getByLabel("Your Answer").fill("3");
    await charliePage.getByRole("button", { name: "Submit answer" }).click();

    // 6. Host sees results with all 3 players listed
    await expect(hostPage.getByRole("heading", { name: "Results" })).toBeVisible({
      timeout: 35_000,
    });

    const hostResults = hostPage.getByRole("region", { name: "Results" });
    await expect(hostResults.getByText("Alice", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(hostResults.getByText("Bob", { exact: true })).toBeVisible();
    await expect(hostResults.getByText("Charlie", { exact: true })).toBeVisible();

    // === Question 2 (MC: "What color is the sky on a clear day?") ===

    // 7. Host starts question 2
    const nextQuestionBtn = hostPage.getByRole("button", {
      name: "Start Next Question",
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

    // 9. Each player taps the first MC option (q2 is multiple choice)
    for (const playerPage of [alicePage, bobPage, charliePage]) {
      await playerPage
        .getByRole("group", { name: "Choices" })
        .getByRole("button", { name: "A) Red" })
        .click();
    }

    // 10. After the last question the host ends the game (it no longer ends by itself)
    await expect(hostPage.getByRole("heading", { name: "Results" })).toBeVisible({
      timeout: 35_000,
    });
    await hostPage.getByRole("button", { name: "End Game", exact: true }).click();

    // Final scoreboard on host shows all 3 players
    await expect(hostPage.getByRole("heading", { name: "Game Over!" })).toBeVisible({
      timeout: 35_000,
    });
    await expect(hostPage.getByRole("heading", { name: "Final Scores" })).toBeVisible();

    const finalScores = hostPage.getByTestId(/^player-score-/);
    await expect(finalScores).toHaveCount(3);
    await expect(finalScores.filter({ hasText: "Alice" })).toBeVisible();
    await expect(finalScores.filter({ hasText: "Bob" })).toBeVisible();
    await expect(finalScores.filter({ hasText: "Charlie" })).toBeVisible();
  });
});
