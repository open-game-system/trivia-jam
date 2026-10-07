import { expect, test } from "@playwright/test";
import { joinAndWait, openRoom } from "./helpers/lobby";
import { answerOnPad, startFirstQuestion } from "./helpers/play";

// Flow 15 (bug bash): someone opens the link to a game that has already ended. Joining is
// impossible there, so the phone says the game has ended and shows the final standings, with a
// way to start a new game, instead of a join form that hangs on "Joining...".

test.describe("Flow 15: arriving at a finished game", () => {
  test("a newcomer sees the game has ended and its final standings, not a join form", async ({ browser }) => {
    test.setTimeout(120_000);
    const room = await openRoom(browser, { withQuestions: true });
    try {
      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      room.contexts.push(ada.playerContext);
      await startFirstQuestion(room);
      await answerOnPad(ada.playerPage, "4");
      await expect(room.hostPage.getByRole("heading", { name: "Results" })).toBeVisible({ timeout: 10_000 });
      await room.hostPage.getByRole("button", { name: "Start Next Question" }).click();
      await ada.playerPage.getByRole("group", { name: "Choices" }).getByRole("button", { name: "B) Blue" }).click();
      await expect(room.hostPage.getByRole("heading", { name: "Results" })).toBeVisible({ timeout: 10_000 });
      await room.hostPage.getByTestId("end-game-button").click();
      await expect(room.hostPage.getByRole("heading", { name: "Game Over!" })).toBeVisible({ timeout: 10_000 });

      const late = await browser.newContext();
      room.contexts.push(late);
      const page = await late.newPage();
      await page.goto(room.gamePath);

      await expect(page.getByRole("heading", { name: "This game has ended" })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByLabel(/your name/i)).toHaveCount(0);
      await expect(page.getByTestId(/^player-score-/)).toHaveText([/Ada/]);
      await page.getByRole("link", { name: "Start a new game" }).click();
      await expect(page).toHaveURL(/\/$/);
    } finally {
      await room.close();
    }
  });
});
