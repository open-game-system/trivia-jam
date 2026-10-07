import { defineConfig } from "@playwright/test";
import base from "../../playwright.config";

/**
 * The repo config without its global setup (the OGS key server on :8833, which chaos does not
 * need and which collides with another Playwright run on the same machine). Chromium only.
 * PLAYWRIGHT_BASE_URL=http://localhost:3101 pnpm exec playwright test -c e2e/chaos/playwright.chaos.config.ts
 */
export default defineConfig({
  ...base,
  globalSetup: undefined,
  testDir: ".",
  outputDir: process.env.CHAOS_OUTPUT_DIR ?? "../../test-results/chaos",
  retries: 0,
  projects: (base.projects ?? []).filter((p) => p.name === "chromium"),
});
