import { expect, test } from "@playwright/test";
import { joinAndWait, openRoom } from "../../helpers/lobby";
import { goOffline, goOnline, newDevice, openPage, type Recorder } from "../devices";

// Chaos finding: a TV (or any screen) whose socket drops and reconnects applies the server's
// catch-up patch on top of the wrong base. actor-kit's client reconnects with the checksum from
// page load, not the last state it received, so the server diffs from the page-load snapshot and
// the client applies that diff to its newer state: a player seated before the drop is added again.
// Expected: after reconnecting, the TV shows the server's players exactly once each.

const rec: Recorder = { note: () => {}, pageProblem: () => {} };

test("a TV that reconnects after missing a join shows each player once", async ({ browser }) => {
  test.setTimeout(90_000);
  const room = await openRoom(browser);
  try {
    const tv = await newDevice(browser, "tv");
    room.contexts.push(tv.context);
    const tvPage = await openPage(tv, room.gamePath.replace("/games/", "/spectate/"), rec);
    await expect(tvPage.getByText("Waiting for game to start")).toBeVisible({ timeout: 15_000 });

    const ada = await joinAndWait(browser, room.gamePath, "Ada");
    room.contexts.push(ada.playerContext);
    await expect(tvPage.getByText("1 player", { exact: true })).toBeVisible();

    await goOffline(tv);
    const ben = await joinAndWait(browser, room.gamePath, "Ben");
    room.contexts.push(ben.playerContext);
    expect(await goOnline(tv)).toBe(true);

    await expect(tvPage.getByText("Ben", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(tvPage.getByText(/^\d+ players?$/)).toHaveText("2 players");
    await expect(tvPage.getByText("Ada", { exact: true })).toHaveCount(1);
  } finally {
    await room.close();
  }
});

// Seed 2 action #1 / seed 6 action #0: nothing even has to change during the drop. The host page
// loaded before anyone joined; a 3 s network blip later, the host lists every player twice.
test("a host whose network blips in the lobby lists each player once", async ({ browser }) => {
  test.setTimeout(90_000);
  const host = await newDevice(browser, "host");
  try {
    const hostPage = await openPage(host, "/", rec);
    await hostPage.getByRole("link", { name: /create new game/i }).click();
    await expect(hostPage).toHaveURL(/\/games\/[a-f0-9-]+/i);
    const gamePath = new URL(hostPage.url()).pathname;
    const ada = await joinAndWait(browser, gamePath, "Ada");
    const ben = await joinAndWait(browser, gamePath, "Ben");
    await expect(hostPage.getByRole("heading", { name: "Players (2/30)" })).toBeVisible();

    await goOffline(host);
    await hostPage.waitForTimeout(3_000);
    expect(await goOnline(host)).toBe(true);
    await hostPage.waitForTimeout(1_000);

    await expect(hostPage.getByRole("heading", { name: /^Players \(\d+\/30\)$/ })).toHaveAccessibleName("Players (2/30)");
    await ada.playerContext.close();
    await ben.playerContext.close();
  } finally {
    await host.context.close();
  }
});
