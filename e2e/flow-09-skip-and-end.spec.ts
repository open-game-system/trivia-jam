import { expect, test } from "@playwright/test";
import { joinAndWait, openRoom } from "./helpers/lobby";
import { Q1, Q2, answerOnPad, startFirstQuestion } from "./helpers/play";

// Flow 9: the host skips a live question (it ends at once: the reveal runs on the TV, the phone
// gets its result, the host gets Next), and the host ends the game early between questions
// (game over on host, phone and TV, without a confirm step: no question is live).

test.describe("Flow 9: skip a question, end the game early", () => {
  test("host skips the live question -> results at once; Next starts question 2", async ({ browser }) => {
    test.setTimeout(60_000);
    const room = await openRoom(browser, { withQuestions: true });
    try {
      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      room.contexts.push(ada.playerContext);

      await startFirstQuestion(room);
      await expect(room.tvPage.getByRole("heading", { name: Q1 })).toBeVisible({ timeout: 15_000 });
      await expect(ada.playerPage.getByTestId("question-timer")).toBeVisible();

      // The skip is a secondary control on the live question (the timer still has ~25 s).
      const skip = room.hostPage.getByRole("button", { name: "Skip question" });
      await expect(skip).toBeVisible();
      await skip.click();
      const skippedAt = Date.now();

      await expect(room.hostPage.getByRole("heading", { name: "Results" })).toBeVisible({ timeout: 5_000 });
      expect(Date.now() - skippedAt).toBeLessThan(5_000);
      await expect(room.hostPage.getByText("No one answered this question")).toBeVisible();
      await expect(room.hostPage.getByTestId("question-timer")).toHaveCount(0);
      await expect(room.tvPage.getByTestId("question-timer")).toHaveCount(0);
      await expect(room.tvPage.getByText(/^the answer$/i)).toBeVisible({ timeout: 10_000 });
      await expect(ada.playerPage.getByTestId("question-timer")).toHaveCount(0);
      await expect(ada.playerPage.getByTestId("correct-answer")).toHaveText("4", { timeout: 15_000 });

      await room.hostPage.getByRole("button", { name: "Start Next Question" }).click();
      await expect(room.tvPage.getByRole("heading", { name: Q2 })).toBeVisible({ timeout: 15_000 });
      await expect(ada.playerPage.getByRole("group", { name: "Choices" })).toBeVisible();
    } finally {
      await room.close();
    }
  });

  test("host ends the game between questions -> game over on host, phone and TV", async ({ browser }) => {
    test.setTimeout(60_000);
    const room = await openRoom(browser, { withQuestions: true });
    try {
      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      room.contexts.push(ada.playerContext);

      await startFirstQuestion(room);
      await expect(room.tvPage.getByRole("heading", { name: Q1 })).toBeVisible({ timeout: 15_000 });
      await answerOnPad(ada.playerPage, "4");
      await expect(room.hostPage.getByRole("heading", { name: "Results" })).toBeVisible({ timeout: 5_000 });

      // End game is on screen between questions (not tucked in Details), and secondary to Next.
      const end = room.hostPage.getByRole("button", { name: "End game" });
      await expect(end).toBeVisible();
      await expect(room.hostPage.getByRole("button", { name: "Start Next Question" })).toBeVisible();
      await end.click();

      await expect(room.hostPage.getByRole("heading", { name: "Game Over!" })).toBeVisible({ timeout: 10_000 });
      await expect(room.hostPage.getByTestId("final-scores-heading")).toBeVisible();
      await expect(ada.playerPage.getByRole("heading", { name: "Game Over!" })).toBeVisible({ timeout: 10_000 });
      await expect(room.tvPage.getByTestId("final-scores-heading")).toBeVisible({ timeout: 10_000 });
      await expect(room.tvPage.getByTestId("winner-announcement")).toContainText("Ada Wins!", { timeout: 10_000 });
    } finally {
      await room.close();
    }
  });
});
