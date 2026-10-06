/**
 * Renders the OGS art kit for Trivia Jam from HTML/CSS in the Aurora Glass look (docs/art-style.md),
 * with no image generation: icon (512 png), cover (600x900 jpg, with the title), logo (1200-wide
 * transparent png) and hero-clean (1920x1080 jpg, no text). tv.jpg comes from a real TV shot instead.
 *
 *   pnpm exec tsx scripts/art-kit/render.mts <out dir> && python3 scripts/art-kit/finish.py <out dir>
 */
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const out = resolve(process.argv[2] ?? "assets/art/aurora");
mkdirSync(out, { recursive: true });
const font = resolve("node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2");

const base = `
  @font-face { font-family: "Inter"; src: url("file://${font}") format("woff2"); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 100%; height: 100%; font-family: "Inter", sans-serif; color: #fff; }
  .night { background: #0b0f1a; position: relative; overflow: hidden; width: 100%; height: 100%; }
  .glows { position: absolute; inset: -12%; filter: blur(var(--blur, 60px));
    background: radial-gradient(42% 34% at 16% 16%, rgba(99,102,241,.7), transparent 70%),
      radial-gradient(48% 38% at 88% 32%, rgba(168,85,247,.6), transparent 70%),
      radial-gradient(46% 32% at 58% 104%, rgba(236,72,153,.45), transparent 70%); }
  .lav { background: linear-gradient(90deg, #818cf8, #c084fc); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .glowtext { background: linear-gradient(180deg, #fff 25%, #c4b5fd); -webkit-background-clip: text; background-clip: text; color: transparent;
    filter: drop-shadow(0 0 .35em rgba(196,181,253,.5)); }
  .glass { background: rgba(255,255,255,.08); border: 2px solid rgba(255,255,255,.2); backdrop-filter: blur(20px); }
  .line { position: absolute; height: var(--h, 10px); border-radius: 99px; background: linear-gradient(90deg, #6366f1, #a855f7);
    box-shadow: 0 0 28px rgba(139,92,246,.8); }
  .chip { position: absolute; border-radius: 50%; display: grid; place-items: center; font-weight: 800; }
  .chip.win { background: #22c55e; border-color: #86efac; box-shadow: 0 0 40px rgba(74,222,128,.8); color: #052e16; }
`;

/** A number line with glass chips: the game's own motif (no numerals in the hero). */
const lineArt = (w: number, top: number, size: number, labels: boolean) => {
  const xs = [0.14, 0.38, 0.52, 0.71];
  return `<div class="line" style="left:${w * 0.06}px;right:${w * 0.06}px;top:${top}px;--h:${Math.round(size / 9)}px"></div>
    ${xs.map((x, i) => `<div class="chip glass${i === 3 ? " win" : ""}" style="width:${size}px;height:${size}px;left:${w * x - size / 2}px;top:${top - size * 1.25}px;font-size:${size * 0.42}px">${labels ? "ASJP"[i] : ""}</div>`).join("")}`;
};

const pages: { name: string; w: number; h: number; html: string; transparent?: boolean }[] = [
  {
    name: "hero-clean",
    w: 1920,
    h: 1080,
    html: `<div class="night"><div class="glows"></div>${lineArt(1920, 700, 190, false)}</div>`,
  },
  {
    name: "cover",
    w: 600,
    h: 900,
    html: `<div class="night" style="--blur:40px"><div class="glows"></div>
      <div style="position:absolute;left:48px;right:48px;top:96px">
        <div style="font-size:15px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#c7d2fe">The closest guess wins</div>
        <h1 class="lav" style="font-size:112px;font-weight:900;line-height:.9;letter-spacing:-.04em;margin-top:18px">Trivia<br>Jam</h1>
      </div>
      <div class="glowtext" style="position:absolute;right:46px;top:430px;font-size:190px;font-weight:900;letter-spacing:-.05em">32</div>
      ${lineArt(600, 790, 54, true)}</div>`,
  },
  {
    name: "icon",
    w: 512,
    h: 512,
    html: `<div class="night" style="--blur:30px"><div class="glows"></div>
      <div class="glass" style="position:absolute;inset:64px;border-radius:96px;display:grid;place-items:center">
        <div class="glowtext" style="font-size:230px;font-weight:900;letter-spacing:-.06em;margin-top:-30px">42</div>
      </div>
      <div class="line" style="left:120px;right:120px;top:356px;--h:14px"></div>
      <div class="chip win" style="width:46px;height:46px;left:316px;top:340px"></div></div>`,
  },
  {
    name: "logo",
    w: 1200,
    h: 520,
    transparent: true,
    html: `<div style="width:1200px;height:520px;display:grid;place-items:center;background:transparent">
      <h1 class="lav" style="font-size:250px;font-weight:900;letter-spacing:-.05em;line-height:.9;text-align:center;filter:drop-shadow(0 0 8px rgba(167,139,250,.6))">Trivia<br>Jam</h1></div>`,
  },
];

const browser = await chromium.launch({ channel: "chrome" });
for (const p of pages) {
  const page = await browser.newPage({ viewport: { width: p.w, height: p.h } });
  await page.setContent(`<!doctype html><html><head><style>${base}</style></head><body>${p.html}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${p.name}.raw.png`, omitBackground: p.transparent === true });
  await page.close();
  console.log(`rendered ${p.name}`);
}
await browser.close();
