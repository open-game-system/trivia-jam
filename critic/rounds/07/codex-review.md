Nintendo ship bar: **5.1/10 overall.** Cohesive and functional, but it still presents like a polished web app mirrored onto a TV—not a authored living-room game show.

| Category | Score | Art-direction verdict |
|---|---:|---|
| Art direction & cohesion | 6 | The violet neon/glass language is consistent across every device, but nearly every screen uses the same gradient, glow, rounded panel, and typographic treatment. `10b-q1-asked-tv`, `11f-q2-standings-tv`, and `21-game-over-settled-tv` should feel like different emotional chapters; currently they feel like different dashboard routes. |
| TV staging & couch readability | 5 | Standings are readable, especially `12f-q3-standings-tv`. Elsewhere, essential information is much too small: plot ticks and player labels in `10d-q1-results-tv`, category answers in `13d-q4-results-tv`, and award details in `21-game-over-settled-tv`. Large areas of the screen are empty while critical content remains phone-sized. |
| Typography & layout | 5 | The display face gives the game a recognizable voice, but it is overused. Tiny uppercase metadata, low-contrast instructions, cramped question wrapping, and inconsistent alignment weaken hierarchy. `12b-q3-asked-tv` has abundant space yet compresses the question into a small upper-left block. |
| Motion & juice | 4 | The countdown ring, glow, and before/settled states imply competent easing, but not much physical cause and effect. Most transitions appear to be fades, pulses, and panel swaps. Nothing visible suggests the tactile anticipation, collision, bounce, or celebratory choreography expected from Mario Party or Buzz. |
| Reveal & payoff drama | 5 | The number-axis setup is promising, and the exact-answer badge in `10e-q1-reveal-settled-tv` reads quickly. But the reveals are compositionally sparse and emotionally flat. `14e-q5-reveal-settled-tv` is essentially a number, two small portraits, and fog. Close guesses, lead changes, and perfect answers do not produce sufficiently different spectacles. |
| Kid UX | 4 | The number pad in `10b-q1-asked-player` has a sensible mental model, but the design shown is portrait and reading-heavy—not demonstrated for a five-year-old using an iPad in landscape. Progress bars, instructions, status text, and answer labels are small. `10d-q1-results-player` replaces interaction with “LOOK AT THE TV,” but the child’s personal result then depends on reading multiple statistics. |
| Phone UI polish | 6 | Visually consistent and generally understandable, but too dense. Host screens such as `12c-q3-results-host` stack panels, chips, dropdowns, stats, and buttons with little breathing room. Small text and repeated nested cards give it an admin-console quality. |
| Host flow | 7 | This is the strongest area. Player counts, waiting states, results, and the next primary action are usually clear: `10b-q1-asked-host` and `13d-q4-results-host` communicate operational state well. The remaining concern is excessive manual phase advancement and the proximity/equal weight of “Skip question” and “End game.” |
| Replay & payoff | 4 | `21-game-over-settled-tv` finally establishes a winner and awards, but the climax is small and static. `20-game-over-tv` briefly shows podium scores as zero, which reads as a public malfunction. There is no strong recap of lead changes, funniest miss, comeback, or shared narrative, and “New game” offers little visible rematch momentum. |

## Single largest gap

**The TV never becomes a show.**

The core information design works, but the TV behaves like an oversized responsive webpage. Question, result, reveal, standings, and finale states need distinct staging, pacing, sound-and-motion signatures, and emotional peaks. Jackbox and Mario Party make the shared screen the entertainer; here it mostly reports state.

## Five highest-impact fixes

1. **Rebuild the round as five theatrical TV stages.**  
   Give intro, answering, guess plot, reveal, and standings visibly different compositions—not the same upper-left header and bottom tray. Use the whole frame in `10b-q1-asked-tv` and `12b-q3-asked-tv`; make the central focal area carry the question or countdown.

2. **Make the answer reveal a choreographed event.**  
   Animate guesses onto the number line, pause, sweep toward the truth, then land the answer with distinct exact/close/wild-miss treatments. In `10d → 10e` and `14d → 14e`, players should be able to feel the outcome before reading it. Perfect answers and lead changes need a substantially bigger payoff.

3. **Design explicitly for ten-foot readability.**  
   Double the minimum size of names, plot labels, instructions, awards, and point changes. Remove nonessential eyebrow copy. Test `10d-q1-results-tv`, `13d-q4-results-tv`, and `21-game-over-settled-tv` from across a room; their current secondary information will disappear.

4. **Create a genuine landscape child interface.**  
   Use large thumb-zone controls, persistent answer confirmation, minimal reading, and visual/audio feedback. The player should understand locked-in, waiting, close, exact, and score gained without parsing sentences. The current phone-like column in `10b-q1-asked-player` is not evidence of an iPad experience.

5. **Turn the finale into a remembered story and immediate rematch.**  
   Eliminate the zero-score intermediate state in `20-game-over-tv`. Then stage the podium sequentially, celebrate the winner at full scale, surface two or three legible awards, recap one decisive moment, and offer “Same players, new questions” as the obvious continuation. `21-game-over-settled-tv` should be the biggest screen in the game; currently it is merely another results panel.
