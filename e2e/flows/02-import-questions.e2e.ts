import { test } from "@e2e-dev/web";
import { expect } from "e2e";
import { QUESTIONS_DOC, UNPARSEABLE_DOC, createGameAsHost, submitQuestions } from "./helpers";

// Flow 2: the host imports questions (paste, mock parse) and sees the parsed list;
// bad input shows the parse error.

test("import: pasted questions parse into the list; Start then waits for a player", async (fixtures) => {
  const { screen } = fixtures;
  await createGameAsHost(fixtures);

  // Submit stays off until there is something to parse.
  await expect(screen.getByRole("button", "Submit")).toBeDisabled();
  await submitQuestions(screen, QUESTIONS_DOC);

  await expect(screen.getByRole("heading", "2 Questions")).toBeVisible({ timeout: 15_000 });
  await expect(screen.getByTestId("parsed-question-1")).toContainText("What is 2 + 2?");
  await expect(screen.getByTestId("parsed-question-1")).toContainText(/answer: 4/i);
  await expect(screen.getByTestId("parsed-question-2")).toContainText("What color is the sky on a clear day?");
  await expect(screen.getByText("b) Blue (correct)")).toBeVisible();
  // The import form is replaced by the list; no error.
  await expect(screen.getByRole("heading", "Import Questions")).not.toBeVisible();
  await expect(screen.getByRole("alert")).not.toBeVisible();
  // Questions alone are not enough: the hint moves on to players.
  await expect(screen.getByText("Waiting for a player to join")).toBeVisible();
  await expect(screen.getByRole("button", "Start Game")).toBeDisabled();
});

test("import: a document with no questions in it shows the parse error", async (fixtures) => {
  const { screen } = fixtures;
  await createGameAsHost(fixtures);

  await submitQuestions(screen, UNPARSEABLE_DOC);

  await expect(screen.getByRole("alert")).toContainText("Could not parse questions", { timeout: 15_000 });
  await expect(screen.getByRole("heading", "Import Questions")).toBeVisible();
  // The host's text is still there to fix, and nothing was imported.
  await expect(screen.getByRole("textbox")).toHaveValue(UNPARSEABLE_DOC);
  await expect(screen.getByText("Add questions to begin")).toBeVisible();

  // A good document afterwards clears the error and imports.
  await submitQuestions(screen, QUESTIONS_DOC);
  await expect(screen.getByRole("heading", "2 Questions")).toBeVisible({ timeout: 15_000 });
  await expect(screen.getByRole("alert")).not.toBeVisible();
});

test("import: a failed re-import keeps the questions already imported and says why", async (fixtures) => {
  const { screen } = fixtures;
  await createGameAsHost(fixtures);
  await submitQuestions(screen, QUESTIONS_DOC);
  await expect(screen.getByRole("heading", "2 Questions")).toBeVisible({ timeout: 15_000 });

  await screen.getByRole("button", "Edit Questions").tap();
  await expect(screen.getByRole("heading", "Import Questions")).toBeVisible();
  await submitQuestions(screen, UNPARSEABLE_DOC);

  await expect(screen.getByRole("alert")).toContainText("Could not parse questions", { timeout: 15_000 });
  // The earlier questions are still the game's questions.
  await expect(screen.getByText("Add questions to begin")).not.toBeVisible();
  await expect(screen.getByText("Waiting for a player to join")).toBeVisible();
});
