import { expect, test } from "@playwright/test";
import { joinAndWait, openRoom } from "../../helpers/lobby";
import { Q1, startFirstQuestion } from "../../helpers/play";
import { fetchServerSnapshot, stateName } from "../oracle";

// Chaos finding: the host removes every player between questions (Players in Host tools) and taps
// End game. setWinner reduces an empty players array (game.machine.ts) and throws, so the game never
// finishes. Expected: the game ends (Game Over on the host, no winner) instead of getting stuck.

test("ending a game after removing every player still finishes it", async ({ browser, baseURL }) => {
  test.setTimeout(90_000);
  const room = await openRoom(browser, { withQuestions: true });
  try {
    const ada = await joinAndWait(browser, room.gamePath, "Ada");
    room.contexts.push(ada.playerContext);
    await startFirstQuestion(room);
    await expect(room.tvPage.getByRole("heading", { name: Q1 })).toBeVisible({ timeout: 15_000 });
    await room.hostPage.getByRole("button", { name: "Skip question" }).click();
    await expect(room.hostPage.getByRole("button", { name: "Start Next Question" })).toBeVisible({ timeout: 10_000 });

    await room.hostPage.getByText(/^Players \(1\)$/).click();
    await room.hostPage.getByRole("button", { name: "Remove Ada" }).click();
    await expect(room.hostPage.getByText(/^Players \(0\)$/)).toBeVisible();
    await room.hostPage.getByRole("button", { name: "End game" }).click();

    await expect
      .poll(async () => stateName(await fetchServerSnapshot(baseURL!, room.gamePath)), { timeout: 10_000 })
      .toBe("finished");
    await expect(room.hostPage.getByRole("heading", { name: "Game Over!" })).toBeVisible({ timeout: 10_000 });
  } finally {
    await room.close();
  }
});
