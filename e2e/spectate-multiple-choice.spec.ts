import { expect, test } from "@playwright/test";
import {
  createGame,
  seedQuestions,
  openSpectateView,
} from "./helpers/game-setup";

// This test depends on the live Gemini API for question parsing.
test.skip(!!process.env.CI, "Skipped in CI — depends on live Gemini API");

/**
 * Questions document with only multiple-choice questions so
 * the first question is guaranteed to be MC.
 */
const MC_QUESTIONS = `What is the largest planet in our solar system?
a) Mars b) Jupiter c) Saturn d) Neptune
Correct answer: B

What color do you get mixing red and blue?
a) Green b) Orange c) Purple d) Yellow
Correct answer: C`;

test.describe("Spectate view multiple choice options", () => {
  test("spectate view shows answer options A, B, C, D during a question", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    // Setup: create game, seed MC questions, join a player (required to start)
    const { hostPage, gamePath } = await createGame(browser);
    await seedQuestions(hostPage, MC_QUESTIONS);

    // Need at least one player to start
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await playerPage.goto(gamePath);
    await playerPage.getByLabel(/your name/i).fill("Spectator Test Player");
    await playerPage.getByRole("button", { name: /join game/i }).click();

    // Wait for host to see the player
    await expect(
      hostPage.getByText(/Players\s*\(\d+\/\d+\)/i)
    ).toBeVisible({ timeout: 10_000 });

    // Open spectate view
    const { spectatePage } = await openSpectateView(browser, gamePath);

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

    // Verify spectate view shows MC options (A, B, C, D labels)
    await expect(spectatePage.getByText("A")).toBeVisible({ timeout: 10_000 });
    await expect(spectatePage.getByText("B")).toBeVisible();
    await expect(spectatePage.getByText("C")).toBeVisible();
    await expect(spectatePage.getByText("D")).toBeVisible();
  });
});
