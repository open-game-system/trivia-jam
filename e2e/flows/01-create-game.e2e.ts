import { test } from "@e2e-dev/web";
import { expect } from "e2e";

// Flow 1: Home -> "Create New Game" -> the host lands on game setup.
test("home: Create New Game lands the host on Game Setup", async ({ app, screen, browser }) => {
  await app.open("/");
  await expect(screen.getByRole("heading", { name: /trivia jam/i, level: 1 })).toBeVisible();

  await screen.getByRole("link", /create new game/i).tap();

  await browser.waitForURL(/\/games\/[a-f0-9-]{36}$/i, { timeout: 15_000 });
  await expect(screen.getByRole("heading", "Game Setup")).toBeVisible();
  await expect(screen.getByRole("heading", "Import Questions")).toBeVisible();
  await expect(screen.getByRole("heading", "Share Game Link")).toBeVisible();
  // The host controls, not the player's join form.
  await expect(screen.getByRole("heading", "Join Game")).not.toBeVisible();
  // Nothing to start yet: no questions, no players.
  await expect(screen.getByRole("button", "Start Game")).toBeDisabled();
  await expect(screen.getByText("Add questions to begin")).toBeVisible();
  await expect(screen.getByRole("heading", "Players (0/30)")).toBeVisible();
});

test("home: each Create New Game is a fresh game", async ({ app, screen, browser }) => {
  await app.open("/");
  await screen.getByRole("link", /create new game/i).tap();
  await browser.waitForURL(/\/games\/[a-f0-9-]{36}$/i, { timeout: 15_000 });
  const first = await browser.url();

  await app.open("/");
  await screen.getByRole("link", /create new game/i).tap();
  await browser.waitForURL(/\/games\/[a-f0-9-]{36}$/i, { timeout: 15_000 });
  const second = await browser.url();

  expect(second).not.toBe(first);
  await expect(screen.getByRole("heading", "Game Setup")).toBeVisible();
});
