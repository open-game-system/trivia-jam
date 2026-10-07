import { expect, test } from "@playwright/test";
import { joinAndWait, openRoom } from "../../helpers/lobby";
import { Q2, startFirstQuestion } from "../../helpers/play";
import { fetchServerSnapshot } from "../oracle";

// Chaos finding (seed 3, action #23): a quick double/triple tap on a multiple-choice tile sends one
// SUBMIT_ANSWER per tap (ChoiceTiles stays enabled until the server's state comes back, and the
// server keeps every answer), so the player has three answers and is scored three times.
// Expected: one answer, scored once (a fastest correct answer is worth 4 points).

test("a triple tap on a choice is one answer, scored once", async ({ browser, baseURL }) => {
  test.setTimeout(90_000);
  const room = await openRoom(browser, { withQuestions: true });
  try {
    const ada = await joinAndWait(browser, room.gamePath, "Ada");
    const ben = await joinAndWait(browser, room.gamePath, "Ben");
    room.contexts.push(ada.playerContext, ben.playerContext);
    await startFirstQuestion(room);
    await room.hostPage.getByRole("button", { name: "Skip question" }).click();
    await room.hostPage.getByRole("button", { name: "Start Next Question" }).click();
    await expect(room.tvPage.getByRole("heading", { name: Q2 })).toBeVisible({ timeout: 15_000 });

    await ada.playerPage.getByRole("group", { name: "Choices" }).getByRole("button", { name: "B) Blue" }).click({ clickCount: 3 });
    await expect(ada.playerPage.getByRole("status").filter({ hasText: "Answer Submitted!" })).toBeVisible();
    await ben.playerPage.getByRole("group", { name: "Choices" }).getByRole("button", { name: "A) Red" }).click();
    await expect(room.hostPage.getByRole("heading", { name: "Results" })).toBeVisible({ timeout: 10_000 });

    const s = await fetchServerSnapshot(baseURL!, room.gamePath);
    const adaId = s.public.players.find((p) => p.name === "Ada")?.id;
    const adaAnswers = s.public.questionResults[1].answers.filter((a) => a.playerId === adaId);
    expect(s.public.players.find((p) => p.id === adaId)?.score, "Ada's score").toBe(4);
    expect(adaAnswers.length, "Ada's answers to q2").toBe(1);
  } finally {
    await room.close();
  }
});
