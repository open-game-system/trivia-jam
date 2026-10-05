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
- [ ] Rig proof (forced faults) -> critic/rig-proof.md
- [ ] Round 01 pass: TV redesign + number-line reveal; kid number pad; host polish; audio
- [ ] OGS: profile-kit, sitting, verifyOgsToken, onOgsPause, hide room code on OGS TV, art kit, catalogue entry
