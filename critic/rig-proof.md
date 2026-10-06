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
| tv-audio-present (> -40 LUFS) | baseline build (no audio), and TJ_FAULT=mute (tap cut) once the TV had sound |
| tv-frame-time (p95 <= 20 ms) | TJ_FAULT=jank (p95 33.4 ms) |

False positives fixed before freezing: the home shot was taken before paint (now waits for the page), and text
truncated by an ellipsis counted as clipped (now intersected with clipping ancestors).

## Rig change before round 01 (2026-10-04)
The redesigned TV stages its reveal over ~10 s, so the recorder now also shoots `*-reveal-settled` (+7 s) and `*-standings` (+12 s) per question. Thresholds unchanged. Round 00 had no staged reveal (results appeared at once), so its comparison is unaffected.

tv-audio-present re-proven on 2026-10-04 with TJ_FAULT=mute (every connection into the recording tap dropped): FAIL, lufs=None. The first mute fault (patching AudioContext.resume) muted nothing, because autoplay had already started the context.

## Rig change before round 02 (2026-10-04)
Added tv-audio-no-clipping (sample peak <= -0.5 dBFS) and tv-audio-no-dead-air (no silence > 4 s under -50 dBFS). Both shown failing on round 01's captured TV audio (peak +4.06 dBFS, 8.9 s silence after a reveal). Round 01 graded Audio 4 partly for exactly these.

## Rig change before round 02 (2026-10-05)
Added the `21-game-over-settled` shot (+12 s) because the finale is now staged over ~11 s. No threshold changed.

## Rig change before round 03 (2026-10-05)
Panels are now recorded with Chrome's screencast (frame swap timestamps) and rebuilt at true timing, instead of Playwright recordVideo, whose TV pane drifted up to 12 s behind the marks (round 02 critic) and whose kid pane lagged 2.5-5 s. Measured after the change: TV, host and kid change within 0.1 s of each other at question 5 (116.2 s). Thresholds unchanged.

## Rig change after round 03 (2026-10-05)
- Panes are resampled onto an exact 30 fps grid by frame arrival time. The round 03 critic found the TV pane ~3.2 s ahead: the concat demuxer rounded each frame duration to 1/25 s (panes encoded 3.4 s short / 8.3 s long), and the screencast timestamps had per-page bases. Verified after: pane lengths 158.5/158.4/158.2 s and all three timers read 25/20/19 together at question 4. Round 03 was re-shot with it (critic/rounds/03/session-synced.mp4, same build).
- Added tv-no-truncated-text (leaf elements with ellipsis/overflow-hidden whose text overflows). Shown failing on the round 03 build: 21-game-over-settled-tv "Grandpa" (the critic saw "Gra...").

## Rig change before round 05 (2026-10-06)
Re-scope (Jon): Trivia Jam is an adult game. The recorded third pane is now an adult player on an iPhone 15 (portrait), shots `*-player.png`; off-camera players are adults (Priya, Jordan). Checks and thresholds unchanged. Round 05 re-baselines (rounds 00-04 used a kid-on-iPad persona).
