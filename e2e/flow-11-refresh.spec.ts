import { expect, test } from "@playwright/test";
import { openSpectateView } from "./helpers/game-setup";
import { joinAndWait, openRoom } from "./helpers/lobby";
import { Q1, answerOnPad, answersSubmitted, lockedIn, numberPad, startFirstQuestion } from "./helpers/play";

// Flow 11: a refresh never costs anyone their place. The host reloads mid-question and still has
// the host controls; a player reloads mid-question and is still seated (no join form, can answer,
// and stays locked in across another reload); a TV opened mid-game shows the current state, and
// one opened after the results shows the settled reveal at once instead of replaying it.

test.describe("Flow 11: refresh", () => {
  test("host and player reload mid-question and keep their roles", async ({ browser }) => {
    test.setTimeout(90_000);
    const room = await openRoom(browser, { withQuestions: true });
    try {
      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      const ben = await joinAndWait(browser, room.gamePath, "Ben");
      room.contexts.push(ada.playerContext, ben.playerContext);
      await startFirstQuestion(room);
      await expect(room.tvPage.getByRole("heading", { name: Q1 })).toBeVisible({ timeout: 15_000 });

      // Host reloads: still the host's live controller, not the player join form.
      await room.hostPage.reload();
      await expect(room.hostPage.getByText(Q1)).toBeVisible({ timeout: 15_000 });
      await expect(room.hostPage.getByRole("button", { name: "Skip question" })).toBeVisible();
      await expect(room.hostPage.getByTestId("question-timer")).toBeVisible();
      await expect(room.hostPage.getByLabel("Your Name")).toHaveCount(0);

      // Player reloads: same seat, still on the question with the pad, no second "Ada".
      await ada.playerPage.reload();
      await expect(numberPad(ada.playerPage)).toBeVisible({ timeout: 15_000 });
      await expect(ada.playerPage.getByLabel("Your Name")).toHaveCount(0);
      await expect(answersSubmitted(room.tvPage, 0, 2)).toBeVisible();
      await answerOnPad(ada.playerPage, "4");
      await expect(lockedIn(ada.playerPage)).toBeVisible();
      await expect(answersSubmitted(room.tvPage, 1, 2)).toBeVisible({ timeout: 10_000 });

      // Reload after answering: still locked in, cannot answer twice.
      await ada.playerPage.reload();
      await expect(lockedIn(ada.playerPage)).toBeVisible({ timeout: 15_000 });
      await expect(numberPad(ada.playerPage)).toHaveCount(0);

      // The round still completes with the original two seats.
      await answerOnPad(ben.playerPage, "5");
      await expect(room.hostPage.getByRole("heading", { name: "Results" })).toBeVisible({ timeout: 5_000 });
      await expect(room.hostPage.getByRole("region", { name: "Results" })).toContainText("+4");
    } finally {
      await room.close();
    }
  });

  test("a TV opened mid-question shows the question; one opened after results shows the settled reveal", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const room = await openRoom(browser, { withQuestions: true });
    try {
      const ada = await joinAndWait(browser, room.gamePath, "Ada");
      const ben = await joinAndWait(browser, room.gamePath, "Ben");
      room.contexts.push(ada.playerContext, ben.playerContext);
      await startFirstQuestion(room);
      await expect(room.tvPage.getByRole("heading", { name: Q1 })).toBeVisible({ timeout: 15_000 });
      await answerOnPad(ada.playerPage, "4");

      // A late TV: the live question, its timer and the answer count, not the lobby.
      const lateTv = await openSpectateView(browser, room.gamePath);
      room.contexts.push(lateTv.spectateContext);
      await expect(lateTv.spectatePage.getByRole("heading", { name: Q1 })).toBeVisible({ timeout: 15_000 });
      await expect(lateTv.spectatePage.getByLabel(/seconds left$/)).toBeVisible();
      await expect(answersSubmitted(lateTv.spectatePage, 1, 2)).toBeVisible();
      await expect(lateTv.spectatePage.getByText("Waiting for game to start")).toHaveCount(0);

      await answerOnPad(ben.playerPage, "5");
      await expect(room.hostPage.getByRole("heading", { name: "Results" })).toBeVisible({ timeout: 5_000 });

      // The live TV plays its reveal through; a TV refreshed now lands on the end state at once:
      // the answer and both players' points within a moment (the live reveal takes several seconds).
      await lateTv.spectatePage.reload();
      const reloadedAt = Date.now();
      await expect(lateTv.spectatePage.getByText(/^the answer$/i)).toBeVisible({ timeout: 10_000 });
      await expect(lateTv.spectatePage.getByText(/^\+\s*4\s*pts$/).first()).toBeVisible({ timeout: 3_000 });
      await expect(lateTv.spectatePage.getByText(/^\+\s*3\s*pts$/).first()).toBeVisible({ timeout: 3_000 });
      expect(Date.now() - reloadedAt).toBeLessThan(8_000);
      await expect(lateTv.spectatePage.getByTestId("question-timer")).toHaveCount(0);

      // Phones still get their outcome after the TV refresh.
      await expect(ada.playerPage.getByText("EXACT!")).toBeVisible({ timeout: 15_000 });
    } finally {
      await room.close();
    }
  });
});
