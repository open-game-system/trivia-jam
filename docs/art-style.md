# Trivia Jam art style: Aurora Glass

Chosen by Jon on 2026-10-06 (option 4 of the third round of mocks). Trivia Jam is an adult party game; the look
is the original Trivia Jam (dark indigo, lavender gradient type, rounded translucent cards, Inter) evolved:
a soft indigo / purple / pink **aurora** glows behind everything, surfaces are **frosted glass**, and the answer
**glows**. Calm and premium at rest, bright at the moments that matter. No emoji, no faces on objects, no mascot.

## Colour tokens

| Token | Value | Use |
|---|---|---|
| `--night` | `#0b0f1a` | the base behind the aurora (TV and phones) |
| `--night-2` | `#111827` | the original gray-900; sheets on phones |
| `--aurora-indigo` | `#6366f1` | aurora blob, axis gradient start |
| `--aurora-purple` | `#a855f7` | aurora blob, axis gradient end |
| `--aurora-pink` | `#ec4899` | aurora blob (low), rare accent |
| `--text` | `#ffffff` | primary text |
| `--text-2` | `#d1d5db` | names, secondary |
| `--text-3` | `#9ca3af` | labels, ticks |
| `--lav-1` → `--lav-2` | `#818cf8` → `#c084fc` | the gradient used for question text (the original's signature) |
| `--glow` | `#c4b5fd` | the answer's glow and white→lavender gradient end |
| `--win` | `#4ade80` (fill `#22c55e`, ink `#052e16`) | exact / correct / the winner chip |
| `--close` | `#fbbf24` | "close" and the overall leader |
| `--glass` | `rgba(255,255,255,.07)` + `backdrop-filter: blur(...)` | chips, cards, rows |
| `--glass-edge` | `rgba(255,255,255,.18)` | 1-2 px borders on glass |

The aurora is three large blurred radial gradients (indigo top-left, purple right, pink bottom) on `--night`,
drifting very slowly (40-60 s loops; still under reduced motion). It is atmosphere: never behind small text at
full strength, never competing with the focal point.

## Type

- **Inter** (variable, self-hosted via `@fontsource-variable/inter`) for everything. Display 800-900 with
  -0.02 to -0.04em tracking; UI 500-700. `font-variant-numeric: tabular-nums` for every number that counts.
- Question text uses the lavender gradient (`--lav-1` → `--lav-2`, `background-clip: text`).
- The answer numeral: 800-900, white → `--glow` vertical gradient with a soft lavender drop-shadow glow.
- Labels: Inter 600, uppercase, +0.12em tracking, `--text-3`.
- TV minimums (1920x1080): labels 28 px, names 36 px, question 72-96 px, answer 240 px+. Phones: 14 px minimum.

## Surfaces and shape

- Glass: `--glass` fill, `--glass-edge` border, `backdrop-filter: blur(16-24px)`, radius 16-24 px (pills for
  chips and stamps). No hard offset shadows, no ink outlines, no halftone, no paper grain, no misregistration.
- Player tokens: round glass chips with the initial; the winner's chip fills with `--win` and glows.
- Stamps (EXACT!, CLOSEST!, GOT IT!): solid pills (`--win` for exact/correct, `--close` for closest), short
  pop-in, never rotated more than 3 degrees.
- The number line: a 4-6 px rounded bar in the indigo → purple gradient with a soft glow; ticks `--text-3`.

## Motion

Soft and confident: glass panels fade-and-rise (12-20 px, 300-450 ms, ease-out), numbers count up, the answer
slams in with a scale-down from 1.4 and a glow bloom, winners' chips lift and glow. One focal motion at a time
on the TV; the aurora drifts underneath. `prefers-reduced-motion`: shorter and calmer, never absent.

## Generated art

None needed in the game. The OGS art kit (icon, cover, logo, clean hero) is rendered from HTML/CSS in this style
(Jon prefers live HTML/CSS over image generation for this game).
