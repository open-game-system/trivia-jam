# Round 01 critic (fresh subagent, Opus) — min 3

Largest gap: the second half of every round is unfinished — after the answer lands the audio goes dead, labels
collide, standings change offstage, the podium has no winner and there's no rematch.

Scores: Art 6, TV 5, Type 6, Motion 5, Reveal 4, Audio 4, Kid 6, Phone 6, Host 5, Content 3, Replay 3, Perf 6.

Defects found: guess labels overprint (10d 8/8, 14e 60/60); out-of-range 100 drawn at 66 with +2 PTS off the right
edge (14e); "STANDINGS" strip + header during the reveal; rank arrows wrong after a tie (10f); podium 1st block has
no winner (20-game-over-tv); reveal hit clips (+0.68 dBFS); 6-9 s digital silence after each reveal; white-noise
drumroll; LOCKED IN stamp flickers; orange key flash; "NOT THIS TIME" headline for a 2nd place +2; host sticky
footer covers "Share Game Link" and cuts a button; 3/30 vs 3/10; phones show the outcome before the TV's answer
lands (TV/kid panes looked 4-6 s behind — unverified recorder offset vs real spoiler); no rematch.

Top fixes: 1 audio mix (limiter, fill post-reveal, real roll, trim reveal bus); 2 finale + rematch; 3 number-line
layout solver; 4 standings as its own beat; 5 kid loop polish; 6 host shell + sync check.
Codex (codex-review.md): 5.0 avg; largest gap "the shared TV never becomes a stage" (use 70-80% of frame, players as
protagonists, real finale + rematch).
