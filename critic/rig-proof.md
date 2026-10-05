# Rig proof (2026-10-04)

Each automatic check in `scripts/evidence.py` was shown to fail on a forced fault (`TJ_FAULT` in
`e2e/record-session.ts`) or on the real baseline, before round 01. The rig is frozen from here: changing it means
re-shooting the previous round with the new rig.

| Check | Shown failing on |
|---|---|
| tv-not-black (luma >= 20) | TJ_FAULT=black |
| tv-not-blown (luma <= 245) | TJ_FAULT=white |
| tv-text-readable (>= 28px) | baseline build (16px "Scan to join the game", 14px "#") |
| phone-text-readable (>= 14px) | baseline build (12px "Exact" chips on the host) |
| nothing-clipped | baseline build (host results heading at y=-55) and TJ_FAULT=clip |
| tv-audio-present (> -40 LUFS) | baseline build (no audio). Re-prove with TJ_FAULT=mute once the TV has sound. |
| tv-frame-time (p95 <= 20 ms) | TJ_FAULT=jank (p95 33.4 ms) |

False positives fixed before freezing: the home shot was taken before paint (now waits for the page), and text
truncated by an ellipsis counted as clipped (now intersected with clipping ancestors).
