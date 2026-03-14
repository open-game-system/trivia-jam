import { expect, test } from "@playwright/test";

// TODO: This test calls the live Gemini API and has two reliability issues:
// 1. Playwright fill() on the textarea doesn't always trigger React's onChange
//    (button stays disabled), likely a React 19 controlled input edge case
// 2. Even when parsing starts, Gemini API can timeout in CI environments
// Skip in CI until we have a mock Gemini endpoint or fix the input interaction.
test.skip(!!process.env.CI, "Skipped in CI — depends on live Gemini API");

test("host can import a simple questions document and see parsed questions @smoke", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.goto("/");

  await page.getByRole("link", { name: /create new game/i }).click();
  await expect(page).toHaveURL(/\/games\/[a-f0-9-]+/i);
  await expect(
    page.getByRole("heading", { name: /import questions/i })
  ).toBeVisible();

  const doc = `What is 2 + 2?\n4\n\nWhat color is the sky on a clear day?\na) Red b) Blue c) Green d) Yellow\nCorrect answer: B`;

  const textarea = page.locator("textarea");
  await textarea.click();
  await textarea.fill(doc);
  const submitBtn = page.getByRole("button", { name: /submit/i });
  await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
  await submitBtn.click();

  // Wait for at least one parsed question to appear (Gemini + parsing pipeline).
  const firstParsed = page.getByTestId("parsed-question-1");
  await expect(firstParsed).toBeVisible({ timeout: 30_000 });

  // Basic sanity check on the text to ensure we didn't hit some unrelated UI.
  await expect(firstParsed).toContainText(/what is 2 \+ 2\?/i);
});
