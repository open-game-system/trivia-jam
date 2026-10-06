# STATUS (resumable)

Branch `feat/aaa-hillclimb-ogs` (local only: no push, no deploy without Jon).
Loop: /aaa-hillclimb. Scorecard `critic/aaa/SCORECARD.md`, rounds in `critic/rounds/NN/`.
Decisions (Jon, 2026-10-04): art = riso game-show print (`docs/art-style.md`); questions = paste only (no built-in
packs); budget `.asset-budget.json` codex 30/day, ElevenLabs 6k, fal 0; no mascot. Local Gemini key is invalid:
the recorder stubs parsing over the WebSocket.

Dev: `pnpm dev` (port 3000, DO state in .wrangler/state). Round evidence: `TJ_OUT=critic/rounds/NN/session.mp4
pnpm exec tsx e2e/record-session.ts && python3 scripts/evidence.py critic/rounds/NN` (rebuild first: `pnpm build`).

## Progress
- [x] Round 00 baseline: critic min 1, Codex 2.9
- [x] Fixes: timer reset on answer, literal •, dev reload loop
- [x] Riso foundation: tokens, fonts, print utilities (src/styles.css, tailwind.config.ts)
- [x] Rig proof (forced faults) -> critic/rig-proof.md (mute check to re-prove now that there is audio)
- [x] Audio: src/audio (cues.ts pure+tested, engine.ts, use-tv-audio.ts), ElevenLabs beds in public/audio/music
- [x] Round 01: critic min 3 (from 1), Codex 5.0 (from 2.9). critic/rounds/01
- [ ] Round 02 pass running: TV agent (number-line solver, focal reveal, standings beat, finale+awards), phones agent (no-spoiler hold, kid result art, host shell, New game), me (audio mix: limiter, no dead air, snare roll — done)
- [ ] e2e sweep chunk 1 (flows 1-4) running in a worktree; brief ~/.claude/handoffs/trivia-jam/2026-10-04-e2e/brief.md
- OPEN QUESTION for Jon: same-room rematch needs the final `finished` state to accept a REMATCH event; an existing test pins "finished is a final state". Not done; round 02 gives the host a "New game" button instead.
- Known: the kid iPad pane in session.mp4 lags 2.5-4.8 s behind marks (Playwright screencast); recorder now logs kid frame times.
- [x] OGS server: verifyOgsToken in game.server.ts (OGS_JOIN_GAME), OGS_JWKS_URL var
- [x] OGS client: onOgsPause -> tvAudio, sitting labels (src/ogs), host declares TV url (OgsTvUrl, no cast button)
- [ ] OGS: hide QR/room code on OGS TV (useOnOgsTv in src/ogs/use-ogs-game.ts -> spectator lobby); phone skips name form with useOgsProfile + sends ogsToken in JOIN_GAME (player-view)
- [x] Art kit (Codex, 4 images): assets/art -> ~/src/ogs-trivia-jam/apps/tv/public/art/trivia-jam
- [x] Catalogue entry: ~/src/ogs-trivia-jam branch feat/trivia-jam-catalogue (worktree of open-game-system, from design/ogs-app-hillclimb), not pushed
- No theme.m4a: the catalogue has no art.theme field yet.

## 2026-10-06 (Jon asleep ~8 h)
- RE-SCOPE (Jon): Trivia Jam is an ADULT party game; no kid/grown-up roles. Scorecard Kid row -> Player phone UX;
  recorder third pane = adult player on iPhone; OGS catalogue roles host+player both grownup, ages 12+ (worktree
  ~/src/ogs-trivia-jam, commit 73c13575, catalogue test exempts ADULT_GAMES from the kid-seat rule).
- Jon doesn't love the riso aesthetic: 8 sketches (assets/art/aesthetics) on https://claude.ai/artifact/VyeiGL8m4qJzfwnQE8McNY
  — WAIT for his pick before any visual polish; climb only structure/staging/timing/audio/copy meanwhile.
- Round 05 agents: phones adult re-scope (remove read-aloud/stars/landscape kid pad, adult results, host reveal-aware),
  TV structural (chip collisions, misses beat, finale blocking, exported takeover time).
- SRE: commits dda6828/9fb2509/76d904a on this branch; split onto `sre-agent-setup` (worktree ~/src/trivia-jam-sre,
  off origin/main, conflicts resolved, tests/build green). NOT pushed: Jon must OK the push (peer session chose (b)).
  SRE_CLOUDFLARE_API_TOKEN is an org secret (all). arch-agent on hold (Claude app install + Jon's OK on the workflow).
- Open decisions for Jon: aesthetic pick; AI question drafter vs paste-only; same-room rematch (changes a pinned test).
- qa-agent (relayed by the SRE session, 2026-10-06): enroll trivia-jam in /qa-agent after the SRE PR and arch-agent.
  Done: Jon ran `e2e@0.17.0 login openai` (pin e2e@0.17.0; use chatgpt() from "e2e/oauth/chatgpt"). Still needs Jon: the QA copy's Cloudflare resources ([env.qa] Worker + own
  DO namespaces/KV), OK for qa-deploy.yml / qa-agent.yml and a push. Not started: tonight's /goal forbids new workflows
  and pushes, and there is no QA copy for the charters to run against. Repo NOT yet in ~/.config/qa-agent/repos.txt.
- Plan change (relayed 2026-10-06): arch-agent and qa-agent are now LOCAL routines on Jon's Mac. arch-agent: nothing to
  install (the "arch-agent daily" routine finds active repos; no workflow, no Claude app needed) — cancelled here.
  qa-agent enroll = [env.qa] in wrangler with its own resources (needs Jon's yes to create), e2e config with qa/prod
  targets (pin e2e@0.17.0, chatgpt() from e2e/oauth/chatgpt), qa/charters.yml, qa/qa-agent.yml, then register the repo
  path in ~/.config/qa-agent/repos.txt. Not done tonight (outside this /goal); see ~/src/skills/qa-agent/SKILL.md.
- TEST CONFLICT for Jon (tied to "lock the host's Next during the TV reveal"): story
  Phone/Screens HostHoldsTheRevealUntilTheTvLands (src/components/phone/phone.stories.tsx ~L440, written tonight with
  the host reveal gate) expects the host to hold results and disable Next until the TV lands; e2e
  flow-07-auto-advance-reveal.spec.ts L25-27 expects results and Next within 5 s. The gate was reverted to keep flow 07
  (existing behaviour), so the story fails. Neither test was edited. Your answer decides which one changes.
- Known story failures: Views/PlayerView/ActiveQuestion (timer, pre-existing) and the one above.
- Riso leftovers kept only because stories assert them: `font-display`/`text-blue` class names on two nodes in
  PlayerResult.tsx (stories/player-view.stories.tsx ~L405/409); neutralised in CSS.
- PINNED COPY for Jon: "GOOD GUESS!" is asserted by e2e flow-07 (guess 5 vs 4, 25% off) and story
  ResultsScoredSecondPlace (5 vs 8, 37.5% off), so a scoring guess 20-50% off still headlines "GOOD GUESS!" (the
  critic called that dishonest). The honest bands live in src/components/phone/honesty.ts; if you OK editing those two
  pins, change the "fair" case to "NOT BAD." / "OFF.".
