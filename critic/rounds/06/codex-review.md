Overall: **5.0/10 — cohesive prototype, not ship-ready at Nintendo’s 8/10 bar.** It has a competent neon quiz-shell, but the TV rarely feels like the main event. The reveals and finale lack the theatrical escalation expected from Jackbox, Buzz!, Mario Party, or Wits & Wagers.

| Area | Grade | Art-direction judgment |
|---|---:|---|
| Art direction & cohesion | **5/10** | Consistent purple, rounded panels, glows, and avatar circles—but it looks like a generic streaming dashboard. `10b-q1-asked-tv`, `10f-q1-standings-tv`, and `14f-q5-standings-tv` are essentially the same visual language at every emotional beat. There is no distinctive world, materiality, humor, or visual metaphor for numerical guessing. |
| TV staging & couch readability | **5/10** | The lobby QR panel is readable in `01-lobby-empty-tv`, and the giant numeral in `10a-before-q1-tv` works. Once play starts, important content shrinks into the upper-left while most of the screen remains unused: `10b-q1-asked-tv`, `12b-q3-asked-tv`. Player markers and axis labels in `10d-q1-results-tv` and `12d-q3-results-tv` are too small for couch distance. |
| Typography & layout | **6/10** | The display type has reasonable weight and the main prompts are legible. But tiny uppercase metadata proliferates everywhere, purple-on-purple contrast is weak, and awkward wraps make simple questions feel cramped—especially `12b-q3-asked-tv` and `14b-q5-asked-tv`. The question should dominate the TV, not occupy roughly one quarter of it. |
| Motion & juice | **4/10** | Inferred from the state sequence: the timer glow, score increments, and reveal bloom provide basic feedback. But the stills imply mostly opacity/scale transitions between static panels. `10d → 10e`, `13d → 13e`, and `20 → 21` need visible anticipation, travel, impact, score counting, and winner reactions—not merely a green lighting change. |
| Reveal & payoff drama | **4/10** | This is substantially below the references. `10d-q1-results-tv` quietly plots dots, then `10e-q1-reveal-settled-tv` jumps to “Exact!” and a large answer. There is no suspenseful pursuit of the correct value, collision moment, near-miss tension, or strong winner ownership. The repeated green “Exact!” composition makes later reveals less exciting, not more. |
| Kid UX | **4/10** | The numeric keypad is straightforward, and locked answers are large. But no landscape iPad layout is shown, which is a sign-off blocker for the stated five-year-old use case. The presented player UI is portrait and text-heavy. `10d-q1-results-player` becomes a dead “LOOK AT THE TV” screen, while `10e-q1-results-player` presents dense comparative statistics that are too abstract and small for a young child. |
| Phone UI polish | **6/10** | Clean and consistent, with good answer confirmation in `10c-q1-player-answered-player`. Yet the screens are crowded with nested cards, tiny labels, narrow progress bars, and nearly identical purple surfaces. Multiple-choice options in `13b-q4-asked-player` need stronger touch-target scale and clearer spatial separation. |
| Host flow | **7/10** | The strongest area. Setup, waiting, starting, skipping, advancing, and ending are understandable across `02-parsing-host`, `04-lobby-full-host`, and `10d-q1-results-host`. However, “Skip question” and “End game” sit together as small peer actions, while result screens overload the host with data. The primary show-running action should always be unmistakable at a glance. |
| Replay & payoff | **4/10** | `21-game-over-settled-tv` feels like a results widget, not the climax of a party. The podium is small, the winner has little visual ownership, awards are tucked into a side card, and the background remains largely empty. `20-game-over-player` communicates placement clearly but offers no personal highlight, playful recap, rematch energy, or reason to pass the device around. |

## Single largest gap

**The shared TV does not produce a show.**

It displays correct information, but it does not control the room’s attention. The question, guess distribution, answer reveal, scoring, and finale all need staged escalation. Right now the TV feels like a spectator dashboard while the phones contain much of the meaningful detail.

## Five highest-impact fixes

1. **Rebuild the answer reveal as a three-act event.**  
   First lock and enlarge every player’s guess; then animate the correct answer traveling onto the range; finally resolve distance, winners, and points one player at a time. Transform `10d-q1-results-tv → 10e-q1-reveal-settled-tv` into the signature moment of the game. Exact hits, close calls, and wild misses should have distinct choreography.

2. **Give the game a proprietary visual world.**  
   Replace the generic purple-card dashboard with a physical game-show stage built around estimation: a dimensional number runway, illuminated answer zones, tactile player tokens, and a central scoring display. Preserve the clarity, but make a single frame recognizable as Trivia Jam without its logo.

3. **Restage the TV for ten-foot viewing.**  
   In `10b`, `12b`, and `14b`, make the question central and roughly twice as large. Enlarge player tokens and submission states. In `10d` and `12d`, let the number line occupy most of the screen height and width; remove micro-labels that cannot be read from a couch.

4. **Design and demonstrate the actual landscape iPad experience.**  
   Create a dedicated landscape composition with giant thumb-reachable controls along the bottom edge, a large persistent answer, minimal reading, and unmistakable lock feedback. Replace the inert `LOOK AT THE TV` state with a child-readable personal reaction such as “You guessed 20” plus a large visual cue directing attention to the TV.

5. **Turn the finale into a 20-second celebration and replay pitch.**  
   In `20-game-over-tv → 21-game-over-settled-tv`, animate podium construction, score count-ups, placement changes, winner arrival, and awards. Give every player one memorable superlative, then end with a strong shared “Play again” beat. The current small podium and side-card awards undersell the entire session.
