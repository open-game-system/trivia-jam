import { expect, test } from "@playwright/test";
import { joinAndWait, openRoom } from "../../helpers/lobby";
import { Q2, startFirstQuestion } from "../../helpers/play";
import { fetchServerSnapshot } from "../oracle";

// Chaos finding (seed 1, action #23): one player with the game open in two tabs taps a choice in
// each; the server records both answers (SUBMIT_ANSWER has no "already answered" guard) and scores
// both. On a fast local server the window is a few ms, so this repro gives Ada's phone 400 ms of
// upstream latency (a slow mobile network): each tab still shows the choices when she taps.
// Expected: one answer per player per question.

test("two tabs of one player answering record one answer", async ({ browser, baseURL }) => {
  test.setTimeout(90_000);
  const room = await openRoom(browser, { withQuestions: true });
  try {
    const ada = await joinAndWait(browser, room.gamePath, "Ada");
    const ben = await joinAndWait(browser, room.gamePath, "Ben");
    room.contexts.push(ada.playerContext, ben.playerContext);
    await ada.playerContext.routeWebSocket(/\/api\/game\//, (ws) => {
      const server = ws.connectToServer();
      ws.onMessage((message) => setTimeout(() => server.send(message), 400));
    });
    const tab1 = await ada.playerContext.newPage();
    await tab1.goto(room.gamePath);
    const tab2 = await ada.playerContext.newPage();
    await tab2.goto(room.gamePath);
    await startFirstQuestion(room);
    await room.hostPage.getByRole("button", { name: "Skip question" }).click();
    await room.hostPage.getByRole("button", { name: "Start Next Question" }).click();
    await expect(room.tvPage.getByRole("heading", { name: Q2 })).toBeVisible({ timeout: 15_000 });
    const red = tab1.getByRole("group", { name: "Choices" }).getByRole("button", { name: "A) Red" });
    const blue = tab2.getByRole("group", { name: "Choices" }).getByRole("button", { name: "B) Blue" });
    await expect(red).toBeVisible();
    await expect(blue).toBeVisible();
    await red.click();
    await blue.click({ timeout: 2_000 }).catch(() => {});

    await expect
      .poll(async () => (await fetchServerSnapshot(baseURL!, room.gamePath)).public.currentQuestion?.answers.length ?? -1, {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);
    await new Promise((r) => setTimeout(r, 1_500));
    const answers = (await fetchServerSnapshot(baseURL!, room.gamePath)).public.currentQuestion?.answers ?? [];
    expect(answers.length, `Ada's answers: ${JSON.stringify(answers.map((a) => a.value))}`).toBe(1);
  } finally {
    await room.close();
  }
});
