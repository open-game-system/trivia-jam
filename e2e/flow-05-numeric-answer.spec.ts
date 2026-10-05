import { expect, test } from "@playwright/test";
import { joinAndWait, openRoom } from "./helpers/lobby";
import { Q1, answersSubmitted, lockedIn, numberPad, startFirstQuestion } from "./helpers/play";

// Flow 5: the host starts the game; question 1 shows on the TV, the host and the player; the
// player answers the numeric question on the on-screen number pad (digits, delete, GO) and sees
// "locked in". Two players so the first answer does not end the question.

test.describe("Flow 5: numeric answer on the number pad", () => {
  test("question 1 on TV, host and phone; digits, delete and GO lock the answer in", async ({ browser }) => {
    const room = await openRoom(browser, { withQuestions: true });
    try {
      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      const ben = await joinAndWait(browser, room.gamePath, "Ben");
      room.contexts.push(ada.playerContext, ben.playerContext);

      await startFirstQuestion(room);

      // Question 1 everywhere.
      await expect(room.tvPage.getByRole("heading", { name: Q1 })).toBeVisible({ timeout: 15_000 });
      await expect(room.tvPage.getByText("Guess the number on your phone")).toBeVisible();
      await expect(answersSubmitted(room.tvPage, 0, 2)).toBeVisible();
      await expect(room.hostPage.getByText(Q1)).toBeVisible();
      await expect(answersSubmitted(room.hostPage, 0, 2)).toBeAttached();
      await expect(ada.playerPage.getByText(Q1)).toBeVisible();

      // The pad: digits build the number, delete takes the last one off, GO needs a number.
      const pad = numberPad(ada.playerPage);
      const typed = ada.playerPage.getByLabel("Your Answer");
      const go = pad.getByRole("button", { name: "Submit answer" });
      await expect(go).toBeDisabled();
      await pad.getByRole("button", { name: "1", exact: true }).click();
      await pad.getByRole("button", { name: "2", exact: true }).click();
      await expect(typed).toHaveValue("12");
      await pad.getByRole("button", { name: "Delete" }).click();
      await expect(typed).toHaveValue("1");
      await pad.getByRole("button", { name: "Delete" }).click();
      await expect(typed).toHaveValue("");
      await expect(go).toBeDisabled();
      await pad.getByRole("button", { name: "4", exact: true }).click();
      await expect(typed).toHaveValue("4");
      await expect(go).toBeEnabled();
      await go.click();

      // Locked in: the stamp shows the number and the pad is gone.
      await expect(lockedIn(ada.playerPage)).toBeAttached();
      await expect(ada.playerPage.getByText("LOCKED IN")).toBeVisible();
      await expect(ada.playerPage.getByText("Waiting for everyone")).toBeVisible();
      await expect(numberPad(ada.playerPage)).toHaveCount(0);

      // Host and TV count the answer; Ben still has his pad, the question is still live.
      await expect(answersSubmitted(room.hostPage, 1, 2)).toBeAttached();
      await expect(answersSubmitted(room.tvPage, 1, 2)).toBeVisible();
      await expect(numberPad(ben.playerPage)).toBeVisible();
      await expect(room.hostPage.getByRole("region", { name: "Waiting on" })).toContainText("Ben");

      // A reload keeps Ada locked in (the answer lives in the game, not the page).
      await ada.playerPage.reload();
      await expect(lockedIn(ada.playerPage)).toBeAttached({ timeout: 15_000 });
      await expect(numberPad(ada.playerPage)).toHaveCount(0);
    } finally {
      await room.close();
    }
  });
});
