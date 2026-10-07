import type { Browser } from "@e2e-dev/web";
import type { App, Screen } from "e2e";
import { expect } from "e2e";

/**
 * Shared steps for the single-device (host phone) flows. The server runs with USE_MOCK_LLM,
 * so any document with words in it parses to the two fixed questions in src/gemini.ts.
 */
export const QUESTIONS_DOC = `What is 2 + 2?
4

What color is the sky on a clear day?
a) Red b) Blue c) Green d) Yellow
Correct answer: B`;

/** A document with nothing a parser could read as a question. */
export const UNPARSEABLE_DOC = "--- ??? ---";

export const GAME_URL = /\/games\/[a-f0-9-]{36}$/i;

/** Home -> Create New Game; resolves once Game Setup is on screen. */
export async function createGameAsHost({ app, screen, browser }: { app: App; screen: Screen; browser: Browser }) {
  await app.open("/");
  await screen.getByRole("link", /create new game/i).tap();
  await browser.waitForURL(GAME_URL, { timeout: 15_000 });
  await expect(screen.getByRole("heading", "Game Setup")).toBeVisible();
  return new URL(await browser.url()).pathname;
}

/** Pastes a document into Import Questions and submits it. */
export async function submitQuestions(screen: Screen, doc: string) {
  await screen.getByRole("textbox").fill(doc);
  await screen.getByRole("button", "Submit").tap();
}
