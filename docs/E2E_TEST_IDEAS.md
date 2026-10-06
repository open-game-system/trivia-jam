# E2E Test Ideas (Trivia Jam)

## Current setup (2026-10 e2e sweep)

**Server.** `pnpm e2e:serve` builds and runs the Worker on :3101 (`E2E_PORT` to change) with
`--var USE_MOCK_LLM:1` and its own `--persist-to .wrangler/state-e2e`. It copies `.dev.vars` without
`GEMINI_API_KEY`; no test needs a real key. The mock parser returns the two fixed questions in
`src/gemini.ts` for any document with a letter or digit, and no questions (so the host's parse error)
for one without, e.g. `--- ??? ---`.

**Two runners, by device count.**

- **tester-army/e2e** (`e2e.config.ts`, tests in `e2e/flows/*.e2e.ts`): single-device flows. Its web
  engine drives one browser with one active tab per test (docs: `node_modules/e2e/docs/reference/web.mdx`,
  "The active tab"); there is no second browser context, so it cannot be a host, a player and a TV at
  once. No agent model is configured: every step is a locator + assertion. Run:
  `APP_URL=http://localhost:3101 pnpm test:e2e:flows` (reuses a running server, else starts `pnpm e2e:serve`).
- **Playwright** (`e2e/*.spec.ts`): multi-device flows, one browser context per device. Shared helpers:
  `e2e/helpers/game-setup.ts` and `e2e/helpers/lobby.ts` (`openRoom`, `joinAndWait`, host/TV locators).
  Run: `PLAYWRIGHT_BASE_URL=http://localhost:3101 pnpm test:e2e` (all three browsers locally; with
  `PLAYWRIGHT_BASE_URL` set, Playwright does not start its own server).

| Flow | Test |
|---|---|
| 1. Home -> Create New Game -> setup | `e2e/flows/01-create-game.e2e.ts` |
| 2. Import questions, parse error, failed re-import | `e2e/flows/02-import-questions.e2e.ts` |
| 3. Player joins; host + TV show them; no duplicates; reload keeps seat | `e2e/flow-03-player-join.spec.ts` |
| 4. Settings reflected on host/TV/timer; host removes a player | `e2e/flow-04-settings-and-remove.spec.ts` |
| 5. Question 1 on TV/host/phone; number pad digits, delete, GO; locked in | `e2e/flow-05-numeric-answer.spec.ts` |
| 6. Multiple choice with the option tiles; right/wrong outcomes | `e2e/flow-06-multiple-choice.spec.ts` |
| 7. Everyone answers -> auto-advance; TV reveal (answer, points); phone outcomes; host Next | `e2e/flow-07-auto-advance-reveal.spec.ts` |
| 8. Time runs out -> results; no timer ever jumps back up (incl. a stale 0 before the first tick) | `e2e/flow-08-timer.spec.ts` |
| 9. Host skips a live question (results at once, Next starts q2); host ends the game between questions -> game over on host, phone, TV | `e2e/flow-09-skip-and-end.spec.ts` |
| 10. Full game (numeric + multiple choice) -> End Game -> final standings on TV, host, phones | `e2e/flow-10-full-game.spec.ts` |
| 11. Host/player reload mid-question keep role and seat; late TV shows the live question; TV refreshed after results shows the settled reveal | `e2e/flow-11-refresh.spec.ts` |
| 12. OGS TV seam: TV framed by a stand-in launcher; `ogs:start` hides the QR/join card; `ogs:suspend` suspends every AudioContext (a press does not wake it), `ogs:resume` -> running | `e2e/flow-12-ogs-tv.spec.ts` |
| 13. OGS phone seam: fake app WebView with a profile + signed game token -> no name form, joins as the token's name (phone, host, TV; reload keeps one seat); a forged page name loses to the token; another game's token falls back to the page's name | `e2e/flow-13-ogs-phone.spec.ts` |
| 14. TV audio: `?record` -> `window.__tvAudioTap()` metered with an AnalyserNode is audible (peak > 0.05) during a question | `e2e/flow-14-tv-audio.spec.ts` |

**OGS seams (flows 12-14).** `e2e/helpers/ogs.ts` holds the fake OGS app WebView
(`window.ReactNativeWebView` answering BRIDGE_READY with STATE_INIT for the `profile` store), a fixed
ES256 test key (`e2e/fixtures/ogs-test-key.json`, test only: the server caches the key set, so the key
never changes) and the token signer. Playwright's global setup (`e2e/global-setup.ts`) serves its key set
on :8833 (`OGS_JWKS_PORT`); flow 13 needs the server pointed at it:
`E2E_PORT=3104 pnpm e2e:serve --var OGS_JWKS_URL:http://localhost:8833/.well-known/jwks.json`, then
`PLAYWRIGHT_BASE_URL=http://localhost:3104 pnpm exec playwright test e2e/flow-1[234]-*.spec.ts`. Flow 13
skips in CI (CI's server verifies against production OGS per wrangler.toml). Flows 12 and 14 press the TV
once, because a test browser may block autoplay (the cloud stream and the recorder allow it).

In-game helpers (`startFirstQuestion`, `answerOnPad`, `setAnswerTime`, `answersSubmitted`, ...) live in
`e2e/helpers/play.ts`. Flow 8 records each value a timer shows with a MutationObserver (instrumentation,
not a selector for interaction), so a value painted for a single frame is caught.

Known gap: `settings.maxPlayers` is shown but not enforced on join (deciding what a turned-away
player sees is a design call, not a bug fix).

Brainstorm for Playwright E2E tests that run in CI. The app needs **multiple participants** to start a game (host + ≥1 player; host needs questions).

## Constraints

- **Backend**: Remix + Cloudflare Workers + Durable Objects + WebSockets. E2E must run the real app (`npm run dev`) or hit a stable staging URL.
- **Questions**: Host must have questions to start. Today that means **PARSE_QUESTIONS** (Gemini). For CI: avoid Gemini (slow, flaky, key in secrets) unless we add a test key and accept cost/flakiness.
- **Multi-player**: Use Playwright **browser contexts** (or multiple pages): one context = one “device” / one session. Host and player get different cookies/session, so they are different users.

## Scenarios that work well in CI (no Gemini)

| Scenario | What it proves | Notes |
|----------|----------------|-------|
| **Homepage → Create Game → Host sees Game Setup** | Host flow loads; Game Setup and “Import Questions” are visible | One context. No questions needed. |
| **Player joins lobby** | Player can open game URL, see Join Game, enter name, join, see “Waiting for host…” (or player list) | Need a **game URL**. Either host creates game in same test (2 contexts) or we create game via API/seed. |
| **Host creates game, player joins same game** | Full lobby flow: host has game URL, player uses it, both see each other in lobby | 2 contexts. Host doesn’t need to add questions for “players in lobby” to show. |
| **Host sees “Start Game” disabled** | When there are no questions (or no players), Start Game is disabled | One context; no questions. |

## Scenarios that need questions (harder in CI)

| Scenario | What it proves | Options |
|----------|----------------|--------|
| **Full game: start → one question → answer → results** | Full happy path | (1) **Seed questions**: add test-only API or service event to set questions on a game (no Gemini). (2) **Use Gemini in CI**: set `GEMINI_API_KEY` in GitHub secrets; one minimal parse; accept ~5–10s and possible flakiness. |
| **Host imports questions (paste + submit)** | Parse flow and error handling | Same as above: seed or real Gemini. |

## Recommended first tests (CI without Gemini)

1. **Host: homepage → Create Game → Game Setup visible**  
   - Go to `/` → click “Create New Game” → expect Game Setup (e.g. “Import Questions”, “Share Game Link”, “Start Game” disabled or similar).

2. **Two contexts: host creates game, player joins**  
   - Context A (host): go to `/` → Create New Game → copy or read game URL from “Share Game Link”.  
   - Context B (player): go to that game URL → see “Join Game” → fill “Your Name” → Join → see lobby (e.g. “Waiting for host…” or player list with host + self).  
   - Optional: host sees “Players (1/…)” or “Players (2/…)” after player joins.

3. **Player: join page shows Join form**  
   - Go to `/games/:gameId` (use a known test game ID or one created in step 2) → expect “Your Name” and “Join Game” (and optionally “How to Play”).

## Future: full game with questions

- **Option A – Seed questions**: Add a test-only mechanism (e.g. `QUESTIONS_PARSED`-style event from a test helper, or internal API) to set questions on a game. Then E2E: host creates game → seed questions → host starts game → player joins (or already in lobby) → one question → player answers → see results.
- **Option B – Gemini in CI**: Store `GEMINI_API_KEY` in GitHub secrets; in E2E, host pastes a tiny doc (e.g. “2+2? 4”) and submits; wait for parse; then start game and run one question. Slower and slightly flaky.
- **Smoke test (real Gemini)**: Keep one tiny Playwright test that pastes a short doc (e.g. `"What is 2 + 2?\n4"`) and asserts that at least one parsed question appears. This runs against the live Gemini API using `GEMINI_API_KEY` in CI and is tagged as `` so it can be filtered if needed.

## Tech notes

- **Base URL**: `http://localhost:8787` (wrangler dev) or from `PLAYWRIGHT_BASE_URL`. In CI, start app with `npm run dev` (or `wrangler dev` + remix) then run Playwright.
- **Stability**: Prefer `getByRole` and `getByLabelText`; wait for network/WebSocket to settle (e.g. wait for “Players (1/…)” or “Join Game” to be visible) to avoid flakiness.
- **Game ID**: For “player joins” in isolation, either create a game in the same test (2 contexts) or have a seeded test game ID (faster, but requires seed script or fixture).
