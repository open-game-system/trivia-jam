# Round 00 critic (fresh subagent, Opus)

Min 1. Largest gap: no staged reveal (the numeric "whose guess was closest?" beat is a plain ranked list), no audio, no kid-usable input.

| Row | Score | Evidence |
|---|---|---|
| Art | 3 | generic dark DaisyUI kit, lavender gradients, drifting polygons; no logo/mascot; emoji crown + medals on 20-game-over-tv |
| TV | 3 | question ~36 px at 1080p; scoreboard ~14-18 px; lobby overflows with 7 "Empty Slot" rows; luma 33-37 everywhere |
| Type | 3 | system sans, no display face; answer numeral ~40 px; literal `8 • 4.7s` escape on every TV result row; host heading clipped |
| Motion | 2 | hard cuts question -> results; no roll-up, stagger, rank FLIP |
| Reveal | 2 | ranked list; no number line, no closest tension; static game over |
| Audio | 1 | none |
| Kid | 2 | text field + system keyboard; dim Submit; "6.472s" shown to a 5yo; MC lettered text, no pictures |
| Phone | 3 | host results heading under progress bar; red x per player; 3/20 vs TV 3/10; dev copy |
| Host | 4 | paste text + AI parse; manual start per question; dead "Waiting for Question..." beat |
| Content | 3 | trivially easy for adults, no guessing spread, no tone, no packs |
| Replay | 2 | final list only, no rematch |
| Perf | 5 | p95 16.7 ms, 233 ms max hitch; timer jumps back up on answer submit (25s->24s->23s->25s) |

Top fixes: 1 number-line reveal; 2 kid number pad (+ picture MC, no ms); 3 audio pass; 4 TV broadcast layout + display type; 5 own art direction + real finale; 6 built-in packs, timer fix, host polish.
Codex judge (critic/rounds/00/codex-review.md): 2.9 avg, largest gap "showmanship".
