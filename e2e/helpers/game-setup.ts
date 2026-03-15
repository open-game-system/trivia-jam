import { expect, type Browser, type Page } from "@playwright/test";

/**
 * Minimal 2-question document for E2E tests.
 * Kept short to minimize Gemini API latency.
 */
const DEFAULT_QUESTIONS_DOC = `What is 2 + 2?
4

What color is the sky on a clear day?
a) Red b) Blue c) Green d) Yellow
Correct answer: B`;

/**
 * Creates a new game as the host.
 * Returns the host page and the game path for other contexts to join.
 */
export async function createGame(browser: Browser) {
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();

  await hostPage.goto("/");
  await hostPage.getByRole("link", { name: /create new game/i }).click();
  await expect(hostPage).toHaveURL(/\/games\/[a-f0-9-]+/i);

  const gamePath = new URL(hostPage.url()).pathname;

  return { hostPage, hostContext, gamePath };
}

/**
 * Seeds questions by pasting into the textarea and submitting.
 * Uses the live Gemini API. Waits up to 45s for parsing.
 */
export async function seedQuestions(
  hostPage: Page,
  questionsDoc: string = DEFAULT_QUESTIONS_DOC
) {
  await expect(
    hostPage.getByRole("heading", { name: /import questions/i })
  ).toBeVisible();

  const textarea = hostPage.locator("textarea");
  await textarea.click();
  await textarea.fill(questionsDoc);

  const submitBtn = hostPage.getByRole("button", { name: /submit/i });
  await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
  await submitBtn.click();

  // Wait for first parsed question to confirm Gemini returned results
  await expect(hostPage.getByTestId("parsed-question-1")).toBeVisible({
    timeout: 45_000,
  });
}

/**
 * Joins a player to an existing game.
 */
export async function joinPlayer(
  browser: Browser,
  gamePath: string,
  playerName: string
) {
  const playerContext = await browser.newContext();
  const playerPage = await playerContext.newPage();

  await playerPage.goto(gamePath);

  await expect(
    playerPage.getByRole("heading", { name: /join game/i })
  ).toBeVisible();

  await playerPage.getByLabel(/your name/i).fill(playerName);
  await playerPage.getByRole("button", { name: /join game/i }).click();

  return { playerPage, playerContext };
}

/**
 * Opens the spectate view for a game.
 * Converts /games/{id} to /spectate/{id}.
 */
export async function openSpectateView(browser: Browser, gamePath: string) {
  const spectateContext = await browser.newContext();
  const spectatePage = await spectateContext.newPage();

  // Convert /games/{id} to /spectate/{id}
  const spectatePath = gamePath.replace(/^\/games\//, "/spectate/");
  await spectatePage.goto(spectatePath);

  return { spectatePage, spectateContext };
}
