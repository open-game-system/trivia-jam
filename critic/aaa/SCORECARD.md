# Trivia Jam: AAA scorecard

Graded like a first-party Nintendo / AAA studio review of a TV + phones party game.

**References (the "10"):** Jackbox Party Pack (Trivia Murder Party 2, Quiplash 3), Buzz! Quiz TV (PS3),
Mario Party Superstars (minigame and results UI), Clubhouse Games: 51 Worldwide Classics, the Wits & Wagers
board game (numeric guessing done right), The Price Is Right set (number reveals as theatre).

A 7 = "competent indie demo". **8 = a first-party art director would sign off on shipping it.**
Grade every row against the references, never against the previous round. Stop when every row ≥ 8
(after at least 3 rounds), or the minimum stays flat through one pivot round.

Players (re-scoped 2026-10-06 by Jon): an ADULT party game. Grown-ups each on their own phone (portrait, one-
handed), one of them hosts, and the TV (cast from the OGS app, nobody touches it) is the shared screen. There is
no kid audience. Rounds 00-04 were graded against a kid-on-iPad persona; round 05 re-baselines on this rubric.

| Row | 6 | 8 (ship bar) | 10 |
|---|---|---|---|
| Art direction & cohesion | consistent template look (dark UI kit, gradients) | one unmistakable look of its own across TV, phones and kid iPad; shape language and palette with intent; not any other game's look | instantly recognisable key art |
| TV staging & couch readability | readable at a desk | everything important readable from 3 m on a 55" TV; one focal point per beat; nothing covers the focal area; scoreboard secondary | every frame a broadcast frame |
| Typography & layout | default font, ad-hoc sizes | display face with character, clear hierarchy, consistent grid, numerals that look great huge | iconic type |
| Motion & juice | fades and tweens | Nintendo-grade easing, anticipation, number roll-ups, satisfying lock-ins, score changes you feel | alive, delightful |
| Reveal & payoff drama | answer shown in a list | the answer reveal is a staged moment (closest-guess tension, number line or equivalent), standings change with drama, the winner gets a real finale | a moment people cheer at |
| Audio | none or stock beeps | music bed per phase, countdown tension, lock-in and reveal stingers, winner fanfare; mixed, never harsh | a theme you'd hum |
| Player phone UX (adults, portrait phone) | usable | answering is fast and one-handed (no system keyboard, thumb-reach pad, big-number formatting), instant feedback on every press, results are competitive and witty (place, points, how far off, who beat you) | effortless |
| Phone UI polish (host + players) | functional | first-party UI: hierarchy, motion, no dev feel, nothing clipped, comfortable on iPhone SE to Pro Max | invisible |
| Host flow | several steps of admin | from "new game" to the first question in under 30 s with good questions ready; host can also play or just run it | effortless |
| Content & game-night fit | whatever the host pastes | the host gets good adult trivia on screen fast; the game supports and checks whatever is brought; tone witty and competitive | you'd buy the pack |
| Replay & payoff | final score list | a finale and reasons to play again (packs, streaks, rematch) | the family asks for another round |
| Performance & stability | ok | 60 fps on the TV page, no hitches or layout jumps, state never stalls, every press lands < 150 ms | — |

## Log

| Round | Art | TV | Type | Motion | Reveal | Audio | Kid/Player | Phone | Host | Content | Replay | Perf | Min | Changed |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 00 | 3 | 3 | 3 | 2 | 2 | 1 | 2 | 3 | 4 | 3 | 2 | 5 | 1 | baseline: DaisyUI dark kit, list reveal with hard cuts, no audio, keyboard text field for the kid, emoji finale, timer resets on submit |
| 01 | 6 | 5 | 6 | 5 | 4 | 4 | 6 | 6 | 5 | 3 | 3 | 6 | 3 | riso redesign (TV, phones, kid pad), audio beds + SFX, OGS; reveal labels collide, dead air + clipping after reveals, podium missing winner, no rematch |
| 02 | 7 | 6 | 7 | 6 | 6 | 6 | 6 | 6 | 5 | 4 | 5 | 7 | 4 | number-line solver, focal reveal + headline, full-screen standings, podium + awards, no-spoiler phones, kid result art, audio limiter/no dead air; standings reorder late, labels still collide, flat mix, kid must read |
| 03 | 7 | 6 | 7 | 7 | 7 | 7 | 7 | 7 | 6 | 5 | 6 | 7 | 5 | standings in-beat, number-line flag/tiebreak, reveal gear shift, 20 s finale ceremony, host one-glance, kid read-aloud, audio drone/roll/key changes; ghost layers after takeover, "Gra..." + podium jump, flat mix, blank paste box |
| 04 | 7 | 6 | 7 | 7 | 7 | 6 | 7 | 6 | 6 | 5 | 6 | 7 | 5 | finale layout lock, no ghosts, standings beat, lock-in band, kid stars/tiles; e2e flows 1-11 (9 bugs fixed); chips collide with names, flat mix, host phone spoils + can skip the reveal |
