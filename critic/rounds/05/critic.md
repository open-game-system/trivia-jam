# Round 05 critic (fresh subagent, Opus) — ADULT re-baseline, Aurora Glass — min 5

Art 6, TV 7, Type 7, Motion 6, Reveal 7, Audio 7, Player 7, Phone 6, Host 6, Content 5, Replay 6, Perf 7.
Largest gap: the reveal→standings beat (run five times a night) is full of state glitches: Exact! stamp
double-mounts (33.10 / gone 33.23-33.50 / back 33.53) with no slam, the takeover snaps to ~55% in one frame
(35.47), totals read "0 TOTAL" 34.0-35.4, standings ranks flash "–", the reorder lands 0.7 s before the next card.
Fixes: 1 idempotent, pre-laid-out takeover (stamp once with slam, FLIP the cluster, totals roll from previous);
2 standings rank state + choreography (old order → deltas → FLIP reorder → hold >= 2 s); 3 MC reveal staged like
numeric (columns, drop wrong options, slam right); 4 host spoiler lock (PENDING Jon); 5 finale composition in
title-safe, AWARDS label, scores count as blocks land; 6 audio (no hole at results, think bed +3 LU, finale bed
-3 LU with dynamics, a motif). Art 6 needs an owned signature idea (display face / motif). Content 5: faster
host import (inline validation, or AI generate — PENDING Jon).
Recorder note: "results" marks are logged ~2.4 s after the cut (by design, after the shot); audio starts 2.88 s in.
E2E on this build: flows 1-14 pass (chromium; flow-03 two tests flaky, passed on retry) + e2e framework 5/5.
