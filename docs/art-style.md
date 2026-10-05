# Trivia Jam art style: riso game-show print

Trivia Jam looks like a **risograph-printed game-show poster that moves**. Everything on screen could have
come off a three-drum riso: flat spot inks on warm paper, overprints that mix where they cross, slight
misregistration, halftone dots for tone, and huge Swiss-poster numerals. No gradients from a UI kit, no
glass cards, no glow, no drop shadows (a misregistered second ink *is* the shadow), no emoji, no faces on
objects, no mascot. The numbers and the players are the stars.

It must not look like the other family games (3D space, cut paper, vinyl/plush diorama, night forest,
clay diorama, gouache). It is flat, graphic and printed.

## Inks (the only colours)

| Token | Ink | Hex | Use |
|---|---|---|---|
| `--paper` | Natural paper | `#F3EEE3` | every background (TV and phones); never pure white |
| `--paper-2` | Paper, second sheet | `#E9E2D3` | panels, cards (a sheet laid on a sheet) |
| `--ink` | Riso Black (warm) | `#1E1B1A` | body text, rules, outlines |
| `--pink` | Fluorescent Pink | `#FF48B0` | energy: timer, "lock in", the correct answer |
| `--blue` | Medium Blue | `#3255A4` | structure: questions, number line, player chips |
| `--yellow` | Yellow | `#FFE800` | highlight: closest guess, winner, spotlight |
| `--teal` | Teal (sparingly) | `#00838A` | "exact!" and success only |

Overprints: where pink crosses blue it reads as purple, yellow over blue as green. Get it with
`mix-blend-mode: multiply` on ink layers over paper, never by inventing new colours. Text is always solid
ink on paper or paper on a solid ink block (contrast ≥ 4.5:1; yellow never carries text on paper).

## Print texture

- Paper grain: a fixed SVG noise layer (`feTurbulence`) at 6-10% multiply over the whole screen.
- Halftone: dot patterns (`radial-gradient` tiles) for tone and for big background shapes; 8-14 px dots
  on the TV, 4-6 px on phones.
- Misregistration: a big shape or numeral is printed twice, the second ink offset 3-6 px down-right
  (TV) or 2-3 px (phones). Use it on display type and key shapes, not on body text.
- Ink edges are slightly rough on big shapes (an SVG displacement filter), crisp on text.

## Type

- **Display + UI:** Bricolage Grotesque (variable, self-hosted via `@fontsource-variable`), weights 700-800
  for display, 500-600 for UI; tight tracking on display (-0.02em).
- **Numerals:** Bricolage Grotesque 800 with `font-variant-numeric: tabular-nums` for anything that counts.
  Answers, timers and scores are set huge: the number is the hero of every frame.
- **Labels / small caps:** Space Mono 700, uppercase, +0.08em tracking (like a print job's slug line).
- Minimum sizes on the TV (1920x1080): body/labels 28 px, player names 36 px, question 72-96 px,
  answer numerals 240 px+. On phones: 16 px minimum, buttons 20 px+.

## Shape language

Chunky rectangles with 0-4 px radius (printed cards), circles (stamps, dots, player tokens), thick
4-6 px ink rules, stars/sunbursts only as print ornaments. Player tokens are solid ink circles with the
initial set in paper colour, one ink per player (blue, pink, teal, yellow on ink, then repeats with a
halftone variant).

## Motion (the print is alive)

- Things are *stamped* or *slid under the roller*: stamps land with an anticipation lift and a 1-frame
  squash; sheets slide in on a quick ease-out (cubic-bezier(.2,.9,.2,1.15)) with a small overshoot.
- Numbers roll up (counter tick) and flip; misregistration can briefly jitter on impact.
- One focal motion at a time on the TV; the background never competes.

## TV composition

The TV is a poster with one focal point per beat: the question while answering, the number line on the
reveal, the podium at the end. Nothing covers the centre. The scoreboard is a strip, shown between
questions, not a sidebar during them.

## Generated art (Codex, then code)

Generated art is a small kit: a transparent wordmark/logo, a 2:3 cover, a 1:1 icon, a 16:9 clean hero for
the OGS launcher, and a few printed ornaments (sunburst, stars, confetti sheet). Everything else is type,
CSS and SVG. Prompt prefix for every image:

> Risograph print, three spot inks only: fluorescent pink #FF48B0, medium blue #3255A4, yellow #FFE800,
> plus warm black, on natural cream paper #F3EEE3. Visible halftone dots, slight ink misregistration,
> paper grain, flat shapes, bold Swiss-poster graphic design, no gradients, no 3D, no photorealism,
> no faces, no characters, no emoji.
