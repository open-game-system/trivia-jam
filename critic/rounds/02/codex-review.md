## Verdict: 6.0/10 — not ready for Nintendo sign-off

This is a strong, unusually cohesive prototype—not generic AI UI—but it still behaves like a stylish scoreboard rather than a fully directed television game show. None of the nine rows reaches the 8/10 shipping bar.

| Area | Grade | Art-direction review |
|---|---:|---|
| Art direction & cohesion | **7** | The cream stock, halftones, hot pink, cyan, navy, and offset-print shadows form a recognizable identity across TV and controllers. `01-lobby-empty-tv` is especially confident. But the treatment is stamped almost uniformly onto every phase: `10b-q1-asked-tv`, `10e-q1-reveal-settled-tv`, and `21-game-over-settled-tv` do not feel emotionally far enough apart. |
| TV staging & couch readability | **6** | Questions and timers read well in `10b-q1-asked-tv`, and the standings screens are immediately understandable. Secondary copy is far too small for a living room, however. Result markers become cluttered in `10d-q1-results-tv`, then collapse into an unreadable knot in `11e-q2-reveal-settled-tv`. The finale in `20-game-over-tv` occupies the lower-left while much of the 16:9 stage is unused. |
| Typography & layout | **6** | Strong display typography and excellent large numerals. `10f-q1-standings-tv` has the cleanest hierarchy. The tiny uppercase metadata is decorative noise at couch distance, while chromatic shadows reduce clarity when applied to smaller text. Several screens alternate between extremely dense clusters and conspicuous dead space. |
| Motion & juice | **5** | Inferred from the endpoints: timers, bursts, stamped labels, and settled states suggest animation, but not a coherent motion language. `10d→10e` appears to add decoration more than transform the moment. `20→21` gains some panels but still lacks the sense of escalation and physical consequence found in Mario Party results. |
| Reveal & payoff drama | **6** | The game correctly separates guesses, answer reveal, awards, and standings. “EXACT!” is a good mechanic to celebrate. But the answer arrives inside an already busy information field. `11e-q2-reveal-settled-tv` should be a perfect communal hit; instead, three players, points, answer, burst, and headline compete simultaneously. `13d→13e` changes the information but barely changes the theatrical staging. |
| Kid UX | **7** | One of the strongest parts. `10b-q1-asked-kid` uses the landscape thumb zones intelligently, `13b-q4-asked-kid` provides enormous answer targets, and the lock-in states clearly stop further input. Weak points: the split numeric arrangement abandons familiar keypad order, delete/GO affordances are comparatively weak, instructions and progress are tiny, and the experience assumes more reading fluency than many five-year-olds have. |
| Phone UI polish | **5** | The kid controller is substantially cleaner than the host phone. Host screens such as `10b-q1-asked-host` through `14d-q5-results-host` resemble a compressed diagnostic dashboard: nested outlines, miniature copy, repeated cards, and weak separation between “information” and “action.” It works, but it does not feel like a finished first-party controller. |
| Host flow | **7** | The end-to-end sequence is sensible: import, share, lobby, start, monitor submissions, review results, advance. `04-lobby-full-host` and the results screens keep the next action visible. Still, the host must scan too many small regions while also running the room. Critical actions and recoveries—advance, end, edit, skip, or correct a mistake—do not have an adequately explicit hierarchy. |
| Replay & payoff | **5** | `21-game-over-settled-tv` adds useful superlatives, and `20-game-over-kid` gives the child a personal placement. But the ending is informational rather than celebratory. The podium is small, the score does not appear to become a dramatic race, awards are secondary cards, and the rematch invitation exists mainly as a host control rather than a shared party moment. |

## Single largest gap

**There is no emotional gear shift.**

The game has a distinctive visual skin, but ordinary questions, exact answers, standings, and victory all live at roughly the same dramatic intensity. Jackbox creates tension through timing and sound; Buzz! turns the room into a stage; Mario Party makes ranking changes into ceremonies; Wits & Wagers makes guesses feel like physical pieces on a board.

Here, even the best possible event—three exact answers in `11e-q2-reveal-settled-tv`—looks like labels accumulating on an infographic.

## Five highest-impact fixes

1. **Direct the reveal as a timed performance.**  
   Build one repeatable sequence: guesses enter as physical tokens → room pauses → scale retracts or spotlights the relevant range → answer lands with impact → exact/closest players break forward → points travel visibly into their totals. Do not show the headline, answer, player stack, and point awards simultaneously as in `11e` and `12e`. Each beat should own the screen briefly.

2. **Solve coincident guesses as a first-class layout case.**  
   The worst visual failure is the collision around 7 in `11e-q2-reveal-settled-tv`. Stack matching players into one deliberate party column, enlarge their tokens, and fan their point awards outward. Reserve an exclusion zone around the answer and never allow labels across it. This will also improve `10e`, where Mom and Sam share 8.

3. **Create a strict ten-foot typography and staging system.**  
   Remove most top-strip microcopy from TV question and reveal screens. Establish three sizes only: broadcast headline, supporting fact, optional metadata. Make every player name and awarded point readable from a couch. Use the full frame at the finale; `20-game-over-tv` and `21-game-over-settled-tv` should not leave half the television emotionally inactive.

4. **Redesign the host phone around one glance and one action.**  
   Each phase should have one dominant bottom action, one large status count, and one collapsible detail area. In `10b-q1-asked-host`, “2 of 3 answered” and “Grandpa is outstanding” matter more than replaying the question card, answer, roster, and miscellaneous controls at equal weight. Preserve the kid controller’s spaciousness; do not shrink the host dashboard further.

5. **Turn the ending into a 20–30 second ceremony and rematch pitch.**  
   In `20→21`, count scores upward, show lead changes, raise the podium, reveal the winner, then present superlatives one at a time. Give every device a personal payoff before showing the overall winner. Finish with a synchronized “Play again?” state on TV, host, and kid screens. The current static podium and awards are a report; the finale needs to become the memory of the game.
