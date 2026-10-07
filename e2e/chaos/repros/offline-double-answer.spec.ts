import { expect, test } from "@playwright/test";
import { joinAndWait, openRoom } from "../../helpers/lobby";
import { Q1, answerOnPad, numberPad, startFirstQuestion } from "../../helpers/play";
import { goOffline, goOnline, newDevice, openPage, type Recorder } from "../devices";
import { fetchServerSnapshot } from "../oracle";

// Chaos finding: a phone that loses its connection mid-question and taps GO gets the number pad
// back (the answer sits in actor-kit's offline queue, the phone shows nothing was sent), so the
// player answers again; when the network returns both SUBMIT_ANSWERs arrive and the server keeps
// both. Expected: one answer per player per question (the first one), never two.

const rec: Recorder = { note: () => {}, pageProblem: () => {} };

test("answers tapped while offline count once per player", async ({ browser, baseURL }) => {
  test.setTimeout(90_000);
  const room = await openRoom(browser, { withQuestions: true });
  try {
    const ada = await newDevice(browser, "Ada");
    room.contexts.push(ada.context);
    const page = await openPage(ada, room.gamePath, rec);
    await page.getByLabel("Your Name").fill("Ada");
    await page.getByRole("button", { name: "Join Game" }).click();
    await expect(page.getByRole("heading", { name: "Welcome, Ada!" })).toBeVisible({ timeout: 15_000 });
    const ben = await joinAndWait(browser, room.gamePath, "Ben");
    room.contexts.push(ben.playerContext);
    await startFirstQuestion(room);
    await expect(room.tvPage.getByRole("heading", { name: Q1 })).toBeVisible({ timeout: 15_000 });

    await goOffline(ada);
    await answerOnPad(page, "4");
    // Nothing tells Ada it is pending: the pad is back, so she answers again.
    await expect(numberPad(page)).toBeVisible();
    await answerOnPad(page, "9");
    expect(await goOnline(ada)).toBe(true);

    await expect
      .poll(async () => (await fetchServerSnapshot(baseURL!, room.gamePath)).public.currentQuestion?.answers.length ?? -1, {
        timeout: 15_000,
      })
      .toBeGreaterThan(0);
    const answers = (await fetchServerSnapshot(baseURL!, room.gamePath)).public.currentQuestion?.answers ?? [];
    expect(answers.map((a) => a.value), "one answer from Ada, the first one").toEqual([4]);
  } finally {
    await room.close();
  }
});
