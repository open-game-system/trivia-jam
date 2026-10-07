import { expect, test } from "@playwright/test";
import { joinAndWait, openRoom } from "../../helpers/lobby";
import { Q1, numberPad, startFirstQuestion } from "../../helpers/play";
import { goOffline, goOnline, newDevice, openPage, type Recorder } from "../devices";

// Chaos finding: actor-kit's client retries a dropped socket 5 times (2, 4, 8, 16, 30 s backoff)
// and then gives up for good ("Max reconnection attempts reached"). A phone that loses signal for
// about a minute (lift, locked screen, walking out of wifi) never comes back: it keeps showing the
// lobby while the game goes on, with no hint to reload. Expected: once the network is back, the
// phone reconnects and shows the live question.

const rec: Recorder = { note: () => {}, pageProblem: () => {} };

test("a phone offline for a minute reconnects and catches up", async ({ browser }) => {
  test.setTimeout(180_000);
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

    await goOffline(ada);
    await page.waitForTimeout(65_000);
    await goOnline(ada);
    await startFirstQuestion(room);
    await expect(room.tvPage.getByRole("heading", { name: Q1 })).toBeVisible({ timeout: 15_000 });

    // Generous: a backoff of up to 30 s after the network returns would still pass.
    await expect(numberPad(page)).toBeVisible({ timeout: 40_000 });
  } finally {
    await room.close();
  }
});
