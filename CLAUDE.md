# CLAUDE.md

## Project

- **Name:** trivia-jam
- **Description:** Real-time multiplayer numerical trivia game for social gatherings, classrooms, and events. Players join from phones via game code; scoring based on accuracy and speed.
- **Tech stack:** TypeScript, React 19, TanStack Start + Router, XState 5, Actor Kit, Vite, Tailwind + DaisyUI, Cloudflare Workers + Durable Objects, Nitro, Zod, Framer Motion
- **Package manager:** pnpm
- **Live:** https://triviajam.tv
- **Storybook:** https://trivia-jam-storybook.pages.dev/

## Feedback Commands

Run in this order. All must pass before committing.

1. `pnpm typecheck`
2. `pnpm test`
3. `pnpm test-storybook` (requires `pnpm build-storybook` first)
4. `pnpm test:e2e` (requires wrangler dev running on :8787)

## Knowledge Base

Start here. Load deeper docs **only when working on the relevant domain.**

| Topic | Location |
|---|---|
| Actor Kit framework & patterns | [docs/ACTOR_KIT.md](docs/ACTOR_KIT.md) |
| V2 game mechanics & scoring | [docs/V2.md](docs/V2.md) |
| Scoring algorithm details | [docs/SCORING_RULES.md](docs/SCORING_RULES.md) |
| Screen layouts & flow | [docs/SCREENS.md](docs/SCREENS.md) |
| E2E test ideas & planning | [docs/E2E_TEST_IDEAS.md](docs/E2E_TEST_IDEAS.md) |
| Nanostores state management | [docs/NANOSTORES.md](docs/NANOSTORES.md) |
| Zod schema patterns | [docs/ZOD.md](docs/ZOD.md) |
| Storybook test runner | [docs/STORYBOOK_TEST_RUNNER.mdx](docs/STORYBOOK_TEST_RUNNER.mdx) |

> **Progressive disclosure:** Do NOT load all docs upfront. Read this file, then load the specific doc relevant to your current task.

## Core Principles

- **Simplicity first**: Minimal code impact. Don't over-engineer.
- **TDD**: Red-green-refactor. Write the test first, see it fail, implement, see it pass.
- **Parse at the boundary**: All external data validated with Zod at system edges. No `any`, no `as` casting.
- **Semantic stability**: Existing features must keep working as new ones are added. If feature B requires changing feature A's behavior, stop and flag it.
- **Never modify existing tests to make new code pass.** If new code breaks existing tests, the new code is wrong — not the tests.

## Key Conventions

- **State machines:** XState 5 for complex state (game, session). Machines in `src/*.machine.ts`, schemas in `src/*.schemas.ts`, types in `src/*.types.ts`.
- **Distributed state:** Actor Kit Durable Objects for game/session persistence. Server classes in `src/*.server.ts`, React contexts in `src/*.context.tsx`.
- **Routing:** TanStack Router file-based routing in `src/routes/`. Loaders use `createServerFn`.
- **Styling:** Tailwind + DaisyUI. No CSS-in-JS. Framer Motion for animations.
- **Components:** Presentational in `src/components/`, containers in `src/screens/`. Hook-based with React contexts.
- **Stores:** Nanostores for simple reactive state (e.g., `host-control.stores.ts`). Immer for immutable updates in machine contexts.
- **Path alias:** `~/*` maps to `./src/*`.
- **Testing:** Storybook for component stories + interactions, Vitest for unit tests, Playwright for E2E.
- **E2E selectors:** `getByRole()`, `getByLabel()`, `getByText()` — never CSS selectors.
- **AI integration:** Gemini API for question parsing (`src/gemini.ts`). Skipped in CI (live external API).

## Keeping Docs Current

| If you... | Then update... |
|---|---|
| Change scoring algorithm | [docs/SCORING_RULES.md](docs/SCORING_RULES.md) + [docs/V2.md](docs/V2.md) |
| Change game state machine | [docs/ACTOR_KIT.md](docs/ACTOR_KIT.md) |
| Change screen flow or layouts | [docs/SCREENS.md](docs/SCREENS.md) |
| Add/change Zod schemas | [docs/ZOD.md](docs/ZOD.md) (if pattern is novel) |
| Add new E2E scenarios | [docs/E2E_TEST_IDEAS.md](docs/E2E_TEST_IDEAS.md) |
| Change tech stack or conventions | This file |

## Off-Limits

- Do NOT modify `.github/workflows/` without explicit approval
- Do NOT commit `.dev.vars` or API keys
- Do NOT use `--no-verify` on git hooks
- Do NOT skip Webkit in local E2E (it's skipped in CI only due to GPU driver crashes)

## Git

- **Main branch:** `main`
- **Remote:** git@github.com:open-game-system/trivia-jam.git
- **CI:** GitHub Actions — preview deploy on PR, E2E on push/PR, Storybook tests on all pushes
- **Branch strategy:** Feature branches → main
