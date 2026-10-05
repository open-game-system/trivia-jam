import { expect, test, type Page } from "@playwright/test";
import { joinAndWait, openRoom } from "./helpers/lobby";
import { Q1, answerOnPad, setAnswerTime, startFirstQuestion } from "./helpers/play";

// Flow 8: the timer runs out with nobody answering -> results everywhere; and a timer never jumps
// back up (an answer arriving must not restart it, and a fresh question must not paint a stale 0
// before its first tick: a TV once showed "0" for a frame right after Start First Question).

/**
 * Records every value the page's timer shows, from the DOM itself (a MutationObserver sees each
 * committed render, including one that is replaced before the next animation frame).
 * Instrumentation only: assertions below go through roles/text.
 */
async function recordTimer(page: Page) {
  await page.evaluate(() => {
    const log: number[] = [];
    Object.assign(window, { __timerLog: log });
    const read = () => {
      const el = document.querySelector('[data-testid="question-timer"]');
      const n = el ? Number.parseInt(el.textContent ?? "", 10) : Number.NaN;
      if (Number.isFinite(n) && log[log.length - 1] !== n) log.push(n);
    };
    new MutationObserver(read).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
  });
}

async function timerLog(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const log: unknown = Reflect.get(window, "__timerLog");
    return Array.isArray(log) ? log.filter((n): n is number => typeof n === "number") : [];
  });
}

const isNonIncreasing = (values: number[]) => values.every((v, i) => i === 0 || v <= values[i - 1]);

test.describe("Flow 8: the timer", () => {
  test("nobody answers: time runs out -> results on host, TV and phone", async ({ browser }) => {
    test.setTimeout(60_000);
    const room = await openRoom(browser, { withQuestions: true });
    try {
      await setAnswerTime(room.hostPage, 5);
      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      room.contexts.push(ada.playerContext);
      await recordTimer(room.tvPage);

      await startFirstQuestion(room);
      await expect(room.tvPage.getByRole("heading", { name: Q1 })).toBeVisible({ timeout: 15_000 });
      const startedAt = Date.now();

      // The server ends the question on time: results within the 5 s window plus slack.
      await expect(room.hostPage.getByText("No one answered this question")).toBeVisible({ timeout: 10_000 });
      expect(Date.now() - startedAt).toBeGreaterThan(3_000);
      await expect(room.hostPage.getByRole("button", { name: "Start Next Question" })).toBeEnabled();
      await expect(room.tvPage.getByTestId("question-timer")).toHaveCount(0);
      await expect(room.tvPage.getByText(/^the answer$/i)).toBeVisible({ timeout: 10_000 });
      await expect(ada.playerPage.getByText("TIME'S UP")).toBeVisible({ timeout: 15_000 });
      await expect(ada.playerPage.getByTestId("correct-answer")).toHaveText("4");
      await expect(ada.playerPage.getByLabel("0 points", { exact: true })).toBeVisible();

      // The TV's dial started at the full 5 (never a stale 0 first) and only ever counted down.
      const tv = await timerLog(room.tvPage);
      expect(tv[0]).toBe(5);
      expect(isNonIncreasing(tv), `TV timer went ${tv.join(" ")}`).toBe(true);
    } finally {
      await room.close();
    }
  });

  test("an answer arriving mid-question never moves any timer back up", async ({ browser }) => {
    test.setTimeout(60_000);
    const room = await openRoom(browser, { withQuestions: true });
    try {
      await setAnswerTime(room.hostPage, 8);
      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      const ben = await joinAndWait(browser, room.gamePath, "Ben");
      room.contexts.push(ada.playerContext, ben.playerContext);
      const watched = { tv: room.tvPage, host: room.hostPage, ben: ben.playerPage };
      for (const page of Object.values(watched)) await recordTimer(page);

      await startFirstQuestion(room);
      await expect(room.tvPage.getByLabel("6 seconds left")).toBeVisible({ timeout: 15_000 });
      await answerOnPad(ada.playerPage, "4");
      await expect(room.tvPage.getByText("Answers Submitted: 1 / 2", { exact: true })).toBeVisible();

      // Ben never answers: the question still ends on time, with Ada's answer scored.
      await expect(room.hostPage.getByRole("heading", { name: "Results" })).toBeVisible({ timeout: 12_000 });
      await expect(room.hostPage.getByRole("region", { name: "Results" })).toContainText("+4");
      await expect(ben.playerPage.getByText("TIME'S UP")).toBeVisible({ timeout: 15_000 });

      for (const [device, page] of Object.entries(watched)) {
        const log = await timerLog(page);
        expect(log.length, `${device} timer was never seen`).toBeGreaterThan(2);
        expect(log[0], `${device} timer started at ${log[0]}`).toBe(8);
        expect(isNonIncreasing(log), `${device} timer went ${log.join(" ")}`).toBe(true);
      }
    } finally {
      await room.close();
    }
  });
});
