import { expect, type Page } from "@playwright/test";
import type { Room } from "./lobby";

/**
 * In-game helpers for specs run against `pnpm e2e:serve` (mock questions: q1 "What is 2 + 2?"
 * numeric, answer 4; q2 "What color is the sky on a clear day?" Red / Blue / Green / Yellow, Blue).
 */

export const Q1 = "What is 2 + 2?";
export const Q2 = "What color is the sky on a clear day?";

/** Host taps Start Game, then Start First Question. */
export async function startFirstQuestion(room: Room) {
  await room.hostPage.getByRole("button", { name: "Start Game" }).click();
  await room.hostPage.getByRole("button", { name: "Start First Question" }).click();
}

/** Host sets the answer time in the settings drawer (lobby only). */
export async function setAnswerTime(hostPage: Page, seconds: number) {
  await hostPage.getByRole("button", { name: "Settings" }).click();
  const drawer = hostPage.getByRole("dialog", { name: "Game Settings" });
  await drawer.getByLabel("Answer Time Window").fill(String(seconds));
  await drawer.getByRole("button", { name: "Save Changes" }).click();
  await expect(drawer).toBeHidden();
}

/** The kid's on-screen number pad. */
export const numberPad = (playerPage: Page) => playerPage.getByRole("group", { name: "Number pad" });

/** Types digits on the number pad (one tap per key) and taps GO. */
export async function answerOnPad(playerPage: Page, digits: string) {
  const pad = numberPad(playerPage);
  for (const digit of digits) {
    await pad.getByRole("button", { name: digit, exact: true }).click();
  }
  await pad.getByRole("button", { name: "Submit answer" }).click();
}

/** The phone's "locked in" confirmation. */
export const lockedIn = (playerPage: Page) => playerPage.getByRole("status").filter({ hasText: "Answer Submitted!" });

/** "Answers Submitted: n / m", on the host (screen-reader line) or the TV. */
export const answersSubmitted = (page: Page, answered: number, players: number) =>
  page.getByText(`Answers Submitted: ${answered} / ${players}`, { exact: true });

/** The number on the TV's timer dial, from its "N seconds left" label (NaN when not shown). */
export async function tvSecondsLeft(tvPage: Page) {
  const label = await tvPage.getByLabel(/seconds left$/).getAttribute("aria-label", { timeout: 1_000 }).catch(() => null);
  return Number(label?.match(/^(\d+) seconds left$/)?.[1]);
}

/** The phone/host timer text ("12s"), as a number (NaN when not shown). */
export async function timerTextSeconds(page: Page) {
  const text = await page.getByTestId("question-timer").textContent({ timeout: 1_000 }).catch(() => null);
  return Number(text?.match(/^(\d+)s?$/)?.[1]);
}
