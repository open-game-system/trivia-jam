import { expect, test } from "@playwright/test";
import { joinAndWait, openRoom } from "./helpers/lobby";
import { Q2, answerOnPad, answersSubmitted, lockedIn, startFirstQuestion } from "./helpers/play";

// Flow 6: a multiple-choice question answered with the option tiles. The mock's q2 is the
// multiple-choice one, so both players answer q1 first.

test.describe("Flow 6: multiple choice with the option tiles", () => {
  test("tiles A-D on the phone, the TV shows the options, the pick locks in and scores", async ({ browser }) => {
    test.setTimeout(90_000);
    const room = await openRoom(browser, { withQuestions: true });
    try {
      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      const ben = await joinAndWait(browser, room.gamePath, "Ben");
      room.contexts.push(ada.playerContext, ben.playerContext);

      await startFirstQuestion(room);
      await answerOnPad(ada.playerPage, "4");
      await answerOnPad(ben.playerPage, "4");
      await room.hostPage.getByRole("button", { name: "Start Next Question" }).click();

      // Question 2: the TV prints the four options, each phone gets four tiles and no number pad.
      await expect(room.tvPage.getByRole("heading", { name: Q2 })).toBeVisible({ timeout: 15_000 });
      for (const option of ["Red", "Blue", "Green", "Yellow"]) {
        await expect(room.tvPage.getByText(option, { exact: true })).toBeVisible();
      }
      const choices = ada.playerPage.getByRole("group", { name: "Choices" });
      await expect(choices.getByRole("button")).toHaveText(["A Red", "B Blue", "C Green", "D Yellow"].map((t) => new RegExp(t.replace(" ", "\\s*"))));
      for (const name of ["A) Red", "B) Blue", "C) Green", "D) Yellow"]) {
        await expect(choices.getByRole("button", { name })).toBeEnabled();
      }
      await expect(ada.playerPage.getByRole("group", { name: "Number pad" })).toHaveCount(0);

      // One tap answers: Ada picks B, the stamp shows her letter and option, the tiles go away.
      await choices.getByRole("button", { name: "B) Blue" }).click();
      await expect(lockedIn(ada.playerPage)).toBeAttached();
      await expect(ada.playerPage.getByText("LOCKED IN")).toBeVisible();
      await expect(ada.playerPage.getByTestId("answer-submitted")).toContainText("Blue");
      await expect(ada.playerPage.getByRole("group", { name: "Choices" })).toHaveCount(0);
      await expect(answersSubmitted(room.tvPage, 1, 2)).toBeVisible();
      await expect(answersSubmitted(room.hostPage, 1, 2)).toBeAttached();

      // Ben picks wrong; everyone has answered, so the results follow.
      await ben.playerPage.getByRole("group", { name: "Choices" }).getByRole("button", { name: "A) Red" }).click();

      // After the TV's reveal, Ada's phone says YES! and Ben's says NOT THIS TIME, both with the answer.
      await expect(ada.playerPage.getByText("YES!")).toBeVisible({ timeout: 20_000 });
      await expect(ada.playerPage.getByTestId("correct-answer")).toHaveText("Blue");
      await expect(ada.playerPage.getByTestId("my-answer")).toHaveText("Blue");
      await expect(ben.playerPage.getByText("NOT THIS TIME")).toBeVisible({ timeout: 20_000 });
      await expect(ben.playerPage.getByTestId("my-answer")).toHaveText("Red");
      await expect(ben.playerPage.getByLabel("0 points", { exact: true })).toBeVisible();
    } finally {
      await room.close();
    }
  });
});
