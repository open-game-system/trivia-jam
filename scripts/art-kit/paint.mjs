// The painted plates for Trivia Jam's OGS art kit (docs/art-style.md, "Painted key art"). Each runs through
// codex.mjs (ChatGPT plan, budget guard, CREDITS, no overwrite without --force). Type is set in code by
// render.mts, never painted. Usage: node scripts/art-kit/paint.mjs <name...|all> [--dry] [--force]
import { spawn } from "node:child_process";

const PREFIX =
  "Premium cinematic key art, glossy stylized 3D illustration with soft volumetric light, Aurora Glass look: a deep indigo night (#0b0f1a) with a luminous indigo, violet and pink aurora, frosted translucent glass objects with bright rim light, one bright green (#4ade80) glow as the focal accent. Elegant and grown-up, a late-night game with friends, rich and polished like a console game cover. No text, no letters, no numbers, no writing, no logos, no faces on objects, no emoji.";

export const KIT = {
  "hero-clean":
    "Wide 16:9 landscape. A long glowing number line, a softly luminous indigo-to-violet glass bar, sweeps from left to right across a vast aurora night sky above a calm reflective lake ringed by dark mountains. Several frosted glass guess markers (smooth round glass tokens like large polished pebbles, each faintly tinted lavender, sky blue, rose and amber) hover just above the bar at different points; the one nearest a bright target point glows vivid green and sends a ring of green light rippling outward. Sparkles of light drift in the air. Small dark silhouettes of a group of grown-up friends on a wooden dock at the bottom left look up at it, seen from behind. Full bleed, no border.",
  "cover-art":
    "Tall 2:3 portrait. Looking up into a towering aurora night sky in indigo, violet and pink; a glowing glass number line arcs diagonally through the lower half of the frame, frosted glass guess markers hovering above it, one glowing vivid green with a burst of green light. Below, a rooftop at night with the soft silhouettes of a few grown-up friends seen from behind, one holding up a phone that glows. The top 38% of the image is calm, darker, open sky with only a faint aurora and a few stars (a title will be set there in code). Full bleed, no border.",
  alt: "Wide 16:9 landscape. Close-up, low angle, shallow depth of field: three perfectly round frosted glass spheres (guess markers, simple orbs, not chess pieces, not pawns, no bases) hovering just above a glowing indigo-to-violet glass number line, the nearest one lit from inside with vivid green light, the others lavender and sky blue and out of focus, a soft aurora of indigo, violet and pink glowing behind, tiny floating sparkles, glossy reflections on the glass bar. Full bleed, no border.",
  icon: "Square app icon composition, centred and simple: one perfectly round glass sphere glowing vivid green from inside (a simple orb, not a chess piece, not a pawn, no base, nothing else on it), hovering just above a short glowing indigo-to-violet glass bar that crosses the lower third, a soft indigo and violet aurora behind on a deep night background, bright rim light. Bold, simple silhouette readable at 48 pixels. No border, no text.",
};

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const names = args.filter((a) => !a.startsWith("--"));
const pick = names.includes("all") ? Object.keys(KIT) : names;
for (const n of pick) if (!(n in KIT)) throw new Error(`unknown kit item ${n}`);

await Promise.all(
  pick.map(
    (n) =>
      new Promise((resolve) => {
        const p = spawn(
          "node",
          [`${process.env.HOME}/src/skills/ai-art-assets/scripts/codex.mjs`, "run", "--prompt", `${PREFIX} ${KIT[n]}`, "--out", `assets/art/paint/${n}.png`, ...flags],
          { stdio: "inherit" },
        );
        p.on("exit", (code) => {
          console.log(`${n}: exit ${code}`);
          resolve(code);
        });
      }),
  ),
);
