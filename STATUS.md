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
- [ ] Round 01 pass: TV agent (spectator-view + src/components/tv) and phones agent (host/player + src/components/game, phone) running
- [x] OGS server: verifyOgsToken in game.server.ts (OGS_JOIN_GAME), OGS_JWKS_URL var
- [x] OGS client: onOgsPause -> tvAudio, sitting labels (src/ogs), host declares TV url (OgsTvUrl, no cast button)
- [ ] OGS: hide QR/room code on OGS TV (useOnOgsTv in src/ogs/use-ogs-game.ts -> spectator lobby); phone skips name form with useOgsProfile + sends ogsToken in JOIN_GAME (player-view)
- [x] Art kit (Codex, 4 images): assets/art -> ~/src/ogs-trivia-jam/apps/tv/public/art/trivia-jam
- [x] Catalogue entry: ~/src/ogs-trivia-jam branch feat/trivia-jam-catalogue (worktree of open-game-system, from design/ogs-app-hillclimb), not pushed
- No theme.m4a: the catalogue has no art.theme field yet.
