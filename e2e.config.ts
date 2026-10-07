import type { E2EConfig } from "e2e";
import { web } from "@e2e-dev/web";

/**
 * tester-army/e2e: single-device flows (the host's phone, one browser tab).
 * Multi-device flows (host + player + TV at once) stay Playwright specs in e2e/*.spec.ts,
 * because this engine drives one browser with one active tab per test (see docs/E2E_TEST_IDEAS.md).
 *
 * No agent model is configured: every test here is deterministic (locators + assertions).
 * The runner reuses a server already on APP_URL, else starts `pnpm e2e:serve`
 * (mock LLM, its own persist dir, port 3101).
 */
const appUrl = process.env.APP_URL ?? "http://localhost:3101";

export default {
  tests: "e2e/flows/**/*.e2e.ts",
  targets: [
    {
      name: "web",
      engine: web({ viewport: { width: 430, height: 932 } }),
      app: {
        url: appUrl,
        command: {
          executable: "pnpm",
          args: ["e2e:serve"],
          startupTimeout: 240_000,
          reuseExisting: true,
          log: ".e2e/logs/server.log",
        },
      },
    },
  ],
  timeout: 60_000,
  assertionTimeout: 10_000,
} satisfies E2EConfig;
