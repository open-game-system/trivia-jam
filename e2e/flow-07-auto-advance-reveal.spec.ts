import { expect, test } from "@playwright/test";
import { joinAndWait, openRoom } from "./helpers/lobby";
import { Q1, answerOnPad, startFirstQuestion } from "./helpers/play";

// Flow 7: all players answer -> the question ends at once (no waiting out the 25 s timer); the TV
// reveal shows the correct answer and the points; each phone holds its result behind "LOOK AT
// THE TV" until the TV lands the answer, then shows the player's outcome; the host sees Next.

test.describe("Flow 7: everyone answers -> results", () => {
  test("auto-advance, TV reveal with answer and points, phones' outcomes, host's Next", async ({ browser }) => {
    test.setTimeout(90_000);
    const room = await openRoom(browser, { withQuestions: true });
    try {
      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      const ben = await joinAndWait(browser, room.gamePath, "Ben");
      room.contexts.push(ada.playerContext, ben.playerContext);

      await startFirstQuestion(room);
      await expect(room.tvPage.getByRole("heading", { name: Q1 })).toBeVisible({ timeout: 15_000 });
      await answerOnPad(ada.playerPage, "4");
      await answerOnPad(ben.playerPage, "5");
      const allAnsweredAt = Date.now();

      // The host has the results and Next straight away (the timer had ~25 s left).
      await expect(room.hostPage.getByRole("heading", { name: "Results" })).toBeVisible({ timeout: 5_000 });
      await expect(room.hostPage.getByRole("button", { name: "Start Next Question" })).toBeEnabled();
      expect(Date.now() - allAnsweredAt).toBeLessThan(5_000);
      await expect(room.hostPage.getByTestId("question-timer")).toHaveCount(0);
      const hostResults = room.hostPage.getByRole("region", { name: "Results" });
      await expect(hostResults).toContainText("Ada");
      await expect(hostResults).toContainText("+4");
      await expect(hostResults).toContainText("Ben");
      await expect(hostResults).toContainText("+3");

      // Phones: no spoiler before the TV lands the answer.
      await expect(ada.playerPage.getByText("LOOK AT THE TV")).toBeVisible();
      await expect(ada.playerPage.getByText("EXACT!")).toHaveCount(0);
      await expect(ada.playerPage.getByTestId("question-timer")).toHaveCount(0);

      // TV: the answer, then the points for each player.
      await expect(room.tvPage.getByText(/^the answer$/i)).toBeVisible({ timeout: 10_000 });
      await expect(room.tvPage.getByTestId("question-timer")).toHaveCount(0);
      await expect(room.tvPage.getByText(/^\+\s*4\s*pts$/).first()).toBeVisible({ timeout: 15_000 });
      await expect(room.tvPage.getByText(/^\+\s*3\s*pts$/).first()).toBeVisible({ timeout: 15_000 });
      await expect(room.tvPage.getByText(/^exact!$/i).first()).toBeVisible();

      // Phones: each player's own outcome, points, the answer and their total.
      await expect(ada.playerPage.getByText("EXACT!")).toBeVisible({ timeout: 15_000 });
      await expect(ada.playerPage.getByTestId("correct-answer")).toHaveText("4");
      await expect(ada.playerPage.getByLabel("4 points", { exact: true })).toBeVisible();
      await expect(ada.playerPage.getByLabel("Place 1")).toBeVisible();
      await expect(ben.playerPage.getByText("GOOD GUESS!")).toBeVisible({ timeout: 15_000 });
      await expect(ben.playerPage.getByTestId("my-answer")).toHaveText("5");
      await expect(ben.playerPage.getByLabel("3 points", { exact: true })).toBeVisible();
      await expect(ben.playerPage.getByLabel("Place 2")).toBeVisible();
      await expect(ben.playerPage.getByLabel("3 points in total")).toBeVisible();
    } finally {
      await room.close();
    }
  });
});
