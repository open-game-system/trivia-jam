import { expect, test } from "@playwright/test";
import {
  createGame,
  seedQuestions,
  joinPlayer,
} from "./helpers/game-setup";

// This test depends on the live Gemini API for question parsing.
test.skip(!!process.env.CI, "Skipped in CI — depends on live Gemini API");

test.describe("Host skips a question", () => {
  test("host can skip question 1 mid-round and question 2 starts", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // 1. Setup: create game, seed 2 questions, join 1 player
    const { hostPage, gamePath } = await createGame(browser);
    await seedQuestions(hostPage);
    const { playerPage } = await joinPlayer(browser, gamePath, "SkipTester");

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

    // 4. Player sees the question timer — confirms question 1 is live
    await expect(playerPage.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });

    // Capture that question 1 is visible on the host side
    // Default seed question 1 is "What is 2 + 2?"
    await expect(hostPage.getByText(/What is 2 \+ 2/i)).toBeVisible({
      timeout: 10_000,
    });

    // 5. Host skips (or advances) the question
    const skipBtn = hostPage.getByRole("button", {
      name: /skip|next.*question/i,
    });
    await expect(skipBtn).toBeVisible({ timeout: 10_000 });
    await skipBtn.click();

    // 6. Question 2 should start — verify the second question appears
    // Default seed question 2 is about color of the sky
    await expect(hostPage.getByText(/color.*sky|sky.*clear/i)).toBeVisible({
      timeout: 15_000,
    });

    // 7. Player sees a fresh timer for question 2
    await expect(playerPage.getByTestId("question-timer")).toBeVisible({
      timeout: 15_000,
    });

    // 8. Complete question 2 normally so the game can end cleanly
    // For MC questions, click the first option; for numeric, fill the input
    const mcOption = playerPage.getByRole("button", { name: /^[A-D]\)/ });
    const numericInput = playerPage.getByLabel(/answer/i);

    if (await mcOption.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await mcOption.first().click();
    } else {
      await numericInput.fill("42");
      await playerPage.getByRole("button", { name: /submit/i }).click();
    }

    // 9. Game should end — verify Game Over screen on host
    await expect(hostPage.getByText(/Game Over/i)).toBeVisible({
      timeout: 35_000,
    });
  });
});
