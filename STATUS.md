# Morning report (2026-10-06)

**Status: committed only.** Nothing pushed, deployed, or checked on a real device (iPad, phone, Chromecast).
- trivia-jam: 153 local commits on `feat/aaa-hillclimb-ogs`.
- OGS catalogue + art kit: 4 commits on `feat/trivia-jam-catalogue` in `~/src/ogs-trivia-jam`.
- SRE split: 4 commits on `sre-agent-setup` in `~/src/trivia-jam-sre`.

## What changed overnight
- **Look:** Aurora Glass is in, the look you picked: dark indigo with a soft aurora, frosted glass, lavender gradient type and a glowing answer. On the TV, Unbounded is the display face for big numbers and headings. The riso look is retired.
- **Brand device:** the glowing number line is now the game's motif, on the lobby wordmark, the question screen and the reveal stage.
- **TV reveal:**
  - the question moves into the results header instead of cutting to black;
  - guesses drop onto a lit number line and a "?" pin searches along it;
  - the answer slams in and the winners take over the screen;
  - then a "rest of the room" beat, and standings that roll, reorder and hold.
- **Multiple choice:** a column reveal where the wrong options drop away.
- **Finale:** a title card, a podium with 1st kept as "?", the winner's name full screen, then an AWARDS column.
- **Adult re-scope:**
  - players answer on a compact phone keypad;
  - results are competitive and honest ("Dead on.", "So close.", "Way off.", "Beat you: Priya");
  - the host phone is one glance and one action, with "Ready: 5 questions" and labelled Host tools.
- **Audio:** music beds sit under the big moments. Results land on a suspense drone, and each answer hits with a held chord. The last question has a bigger build. The finale holds back, then the fanfare lands on the winner reveal. One short Trivia Jam motif is shared by the question bell and the fanfare.
- **OGS art kit:** icon, cover, logo, clean hero and `tv.jpg`, all in Aurora Glass and rendered from HTML/CSS (`scripts/art-kit/`), not generated images. Installed in `~/src/ogs-trivia-jam` and committed there.
- **E2E sweep:** finished. Flows 1–14 are covered: 22 Playwright tests plus 5 in the e2e framework, all passing on the final build. Bugs it found and fixed tonight:
  - after a TV reveal, a multiple-choice question could show twice on the TV;
  - the "Final scores" banner overflowed its card;
  - a player's colour on the TV didn't match their colour on the phones;
  - an empty frame appeared between the winner reveal and the standings;
  - the timer numeral touched its ring.

## Scores (critic minimum; full rows in critic/aaa/SCORECARD.md)

| Round | Min | Notes |
|---|---|---|
| 00–04 | 1 → 3 → 4 → 5 → 5 | riso look, graded against the kid-on-iPad persona |
| 05 | 5 | adult re-baseline in Aurora Glass |
| 06 | 5 | standings choreography, MC columns, host polish |
| 07 | 5 | pivot round: brand axis, Unbounded, continuity, audio escalation |

In round 07 every row scored 6–7 except Content, which stayed at 5. Content can't move under the paste-only rule, so the climb stopped by its rule: the minimum stayed flat through the pivot round.

The rows that can still move need your decisions (below), or the critic's remaining notes:
- the winner reveal is weighted to the left of the screen;
- the last question's escalation isn't audible yet;
- the whole mix sits around -27 LUFS, quiet for a TV.

**Latest video:** `critic/rounds/final/session.mp4` (final build; all 10 automatic checks pass). Round videos are in `critic/rounds/NN/`.

## Decisions waiting on you
1. **Questions:** stay paste-only (Content stays at 5), add an AI question drafter (needs a working Gemini key; the local one is rejected), or allow built-in packs.
2. **Rematch with the same players:** needs the game's final "finished" state to accept a rematch. That changes an existing test that pins it as final.
3. **Locking the host's Next during the TV reveal:** e2e flow 7 wants Next straight away, while a story written tonight (`HostHoldsTheRevealUntilTheTvLands`) wants it held. One of the two tests has to change; the story currently fails.
4. **"GOOD GUESS!" copy:** it's pinned by flow 7 and a story, so a scoring guess 20–50% off still says it. The honest bands are in `src/components/phone/honesty.ts`.
5. **SRE:** push `sre-agent-setup` (`~/src/trivia-jam-sre`) and open its PR? Then I'd run `gh workflow run sre-agent -f dry=true`.
6. **qa-agent:** the QA copy's Cloudflare resources need your yes. arch-agent is now a local routine; nothing to install here.
7. **Kid speaker button:** resolved. The read-aloud button was removed in the adult re-scope.
8. **Deploy:** when ready, deploy triviajam.tv and the OGS API/launcher (separately), then cast to the Chromecast and run `/verify-on-device`.

## Known issues
- Two Storybook failures: `Views/PlayerView/ActiveQuestion` (an older timer story) and `HostHoldsTheRevealUntilTheTvLands` (decision 3).
- Two class names, `font-display` and `text-blue`, stay in `PlayerResult` only because a story asserts them; they render as Inter.
- `tv-model.ts`'s `inkForIndex` is unused, but a test still asserts it.
- `standings-beat.ts` and `standings-frame.ts` are unused, but tests still import them.

---
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
