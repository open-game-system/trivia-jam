import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { createGame, joinPlayer, openSpectateView, seedQuestions } from "./game-setup";

/**
 * Multi-device lobby helpers for specs run against `pnpm e2e:serve` (USE_MOCK_LLM: any document
 * with words in it parses to "What is 2 + 2?" (4) and "What color is the sky on a clear day?"
 * (Red / Blue / Green / Yellow, Blue)).
 */

/** The host's "Players (n/max)" heading. */
export const hostPlayersHeading = (hostPage: Page, count: number, max = 30) =>
  hostPage.getByRole("heading", { name: `Players (${count}/${max})` });

/** One row per player in the host's ledger. */
export const hostPlayerRows = (hostPage: Page, name: string) =>
  hostPage.getByRole("listitem").filter({ hasText: name });

/** A player's name on the TV lobby table. */
export const tvSeatName = (tvPage: Page, name: string) => tvPage.getByText(name, { exact: true });

/** Joins and waits until the player's phone shows the lobby welcome. */
export async function joinAndWait(browser: Browser, gamePath: string, name: string) {
  const joined = await joinPlayer(browser, gamePath, name);
  await expect(joined.playerPage.getByRole("heading", { name: `Welcome, ${name}!` })).toBeVisible({
    timeout: 15_000,
  });
  return joined;
}

export type Room = {
  gamePath: string;
  hostPage: Page;
  tvPage: Page;
  contexts: BrowserContext[];
  close: () => Promise<void>;
};

/** Host creates a game (optionally importing the mock questions) and the TV opens /spectate. */
export async function openRoom(browser: Browser, { withQuestions = false } = {}): Promise<Room> {
  const { hostPage, hostContext, gamePath } = await createGame(browser);
  await expect(hostPage.getByRole("heading", { name: "Game Setup" })).toBeVisible();
  if (withQuestions) await seedQuestions(hostPage);
  const { spectatePage, spectateContext } = await openSpectateView(browser, gamePath);
  await expect(spectatePage.getByText("Waiting for game to start")).toBeVisible({ timeout: 15_000 });
  const contexts = [hostContext, spectateContext];
  return {
    gamePath,
    hostPage,
    tvPage: spectatePage,
    contexts,
    close: async () => {
      await Promise.all(contexts.map((c) => c.close()));
    },
  };
}
