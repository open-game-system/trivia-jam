import { expect, test } from "@playwright/test";
import { joinAndWait, openRoom } from "./helpers/lobby";
import { Q1, Q2, answerOnPad, startFirstQuestion } from "./helpers/play";

// Flow 10: a whole game, both mock questions, to the finale: after the last question the host
// gets End Game (not Next), and the final standings show on the TV, the host and each phone.

test.describe("Flow 10: full game to the finale", () => {
  test("two questions, then final standings on TV, host and players", async ({ browser }) => {
    test.setTimeout(120_000);
    const room = await openRoom(browser, { withQuestions: true });
    try {
      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      const ben = await joinAndWait(browser, room.gamePath, "Ben");
      room.contexts.push(ada.playerContext, ben.playerContext);

      // Q1 (numeric): Ada exact, Ben close.
      await startFirstQuestion(room);
      await expect(room.tvPage.getByRole("heading", { name: Q1 })).toBeVisible({ timeout: 15_000 });
      await answerOnPad(ada.playerPage, "4");
      await answerOnPad(ben.playerPage, "5");
      await expect(room.hostPage.getByRole("heading", { name: "Results" })).toBeVisible({ timeout: 5_000 });

      // Q2 (multiple choice, the last one): Ada right, Ben wrong.
      await room.hostPage.getByRole("button", { name: "Start Next Question" }).click();
      await expect(room.tvPage.getByRole("heading", { name: Q2 })).toBeVisible({ timeout: 15_000 });
      await ada.playerPage.getByRole("group", { name: "Choices" }).getByRole("button", { name: "B) Blue" }).click();
      await ben.playerPage.getByRole("group", { name: "Choices" }).getByRole("button", { name: "A) Red" }).click();
      await expect(room.hostPage.getByRole("heading", { name: "Results" })).toBeVisible({ timeout: 5_000 });

      // Last question: no Next, the host's one action is End Game.
      await expect(room.hostPage.getByText("That was the last question.")).toBeVisible();
      await expect(room.hostPage.getByRole("button", { name: "Start Next Question" })).toHaveCount(0);
      await room.hostPage.getByTestId("end-game-button").click();

      // Host: winner and the final standings, highest first.
      await expect(room.hostPage.getByRole("heading", { name: "Game Over!" })).toBeVisible({ timeout: 10_000 });
      await expect(room.hostPage.getByTestId("winner-announcement")).toContainText("Ada Wins!");
      await expect(room.hostPage.getByTestId(/^player-score-/)).toHaveText([/Ada/, /Ben\s*3\s*pts/]);
      await expect(room.hostPage.getByRole("link", { name: "New game" })).toBeVisible();

      // Phones: each player's place and total, and the shared standings.
      await expect(ada.playerPage.getByRole("heading", { name: "Game Over!" })).toBeVisible({ timeout: 10_000 });
      await expect(ada.playerPage.getByLabel("You finished 1st")).toBeVisible();
      await expect(ada.playerPage.getByTestId("winner-announcement")).toContainText("Ada Wins!");
      await expect(ben.playerPage.getByRole("heading", { name: "Game Over!" })).toBeVisible({ timeout: 10_000 });
      await expect(ben.playerPage.getByLabel("You finished 2nd")).toBeVisible();
      await expect(ben.playerPage.getByLabel("3 points", { exact: true })).toBeVisible();
      await expect(ben.playerPage.getByTestId(/^player-score-/)).toHaveText([/Ada/, /Ben\s*3\s*pts/]);

      // TV: the finale with the winner and the final scores.
      await expect(room.tvPage.getByTestId("final-scores-heading")).toBeVisible({ timeout: 10_000 });
      await expect(room.tvPage.getByTestId("winner-announcement")).toContainText("Ada Wins!", { timeout: 10_000 });
      await expect(room.tvPage.getByTestId(/^player-score-/)).toHaveCount(2);
      await expect(room.tvPage.getByTestId("question-timer")).toHaveCount(0);
    } finally {
      await room.close();
    }
  });
});
