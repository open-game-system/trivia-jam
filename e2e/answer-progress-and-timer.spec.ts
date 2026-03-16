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
  test("host shows answer count as fraction during active question", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    const { hostPage, gamePath } = await createGame(browser);
    await seedQuestions(hostPage);
    const { playerPage: player1Page } = await joinPlayer(
      browser,
      gamePath,
      "Alice"
    );
    const { playerPage: player2Page } = await joinPlayer(
      browser,
      gamePath,
      "Bob"
    );

    // Wait for host to see both players
    await expect(hostPage.getByText(/Players\s*\(2\/\d+\)/i)).toBeVisible({
      timeout: 15_000,
    });

    // Start game + first question
    const startBtn = hostPage.getByRole("button", { name: /start game/i });
    await expect(startBtn).toBeEnabled({ timeout: 5_000 });
    await startBtn.click();

    const nextQuestionBtn = hostPage.getByRole("button", {
      name: /start.*question|next.*question/i,
    });
    await expect(nextQuestionBtn).toBeVisible({ timeout: 10_000 });
    await nextQuestionBtn.click();

    // Wait for players to see the question
    await expect(player1Page.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });
    await expect(player2Page.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });

    // Player 1 submits answer
    await player1Page.getByLabel(/answer/i).fill("4");
    await player1Page.getByRole("button", { name: /submit/i }).click();

    // Host should show "1 / 2" in the answers section
    await expect(
      hostPage.getByText(/Answers Submitted:\s*1\s*\/\s*2/i)
    ).toBeVisible({ timeout: 10_000 });

    // Player 2 submits answer
    await player2Page.getByLabel(/answer/i).fill("4");
    await player2Page.getByRole("button", { name: /submit/i }).click();

    // Host should show "2 / 2" and "All players answered!"
    await expect(
      hostPage.getByText(/Answers Submitted:\s*2\s*\/\s*2/i)
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      hostPage.getByText(/All players answered/i)
    ).toBeVisible({ timeout: 5_000 });
  });

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

  test("spectator view shows answer count during active question", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    const { hostPage, gamePath } = await createGame(browser);
    await seedQuestions(hostPage);
    const { playerPage } = await joinPlayer(browser, gamePath, "SpectateTest");
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

    // Spectator should see timer
    await expect(spectatePage.getByTestId("question-timer")).toBeVisible({
      timeout: 10_000,
    });

    // Spectator should show answer progress (0/1 or similar)
    await expect(
      spectatePage.getByText(/Answers Submitted:\s*0\s*\/\s*1/i)
    ).toBeVisible({ timeout: 10_000 });

    // Player submits answer
    await playerPage.getByLabel(/answer/i).fill("4");
    await playerPage.getByRole("button", { name: /submit/i }).click();

    // Spectator should show 1/1
    await expect(
      spectatePage.getByText(/Answers Submitted:\s*1\s*\/\s*1/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});
