/**
 * Renders Trivia Jam's OGS art kit (docs/art-style.md, "Painted key art"): the painted plates from
 * scripts/art-kit/paint.mjs (assets/art/paint/*.png) plus the title set in code in Unbounded, never painted.
 *   icon (512 png), cover (600x900 jpg, with the title), logo (1200-wide transparent png, trimmed by finish.py),
 *   hero-clean and alt (1920x1080 jpg, no text). tv.jpg comes from a real TV shot instead.
 *
 *   pnpm exec tsx scripts/art-kit/render.mts <out dir> && python3 scripts/art-kit/finish.py <out dir>
 */
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const out = resolve(process.argv[2] ?? "assets/art/kit");
mkdirSync(out, { recursive: true });
// Embedded as a data URI: a page set with setContent is about:blank and can't load file:// fonts.
const unbounded = `data:font/woff2;base64,${readFileSync(
  resolve("node_modules/@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2"),
).toString("base64")}`;
const paint = (name: string) =>
  `data:image/png;base64,${readFileSync(resolve("assets/art/paint", `${name}.png`)).toString("base64")}`;

const base = `
  @font-face { font-family: "Unbounded"; src: url("${unbounded}") format("woff2"); font-weight: 200 900; }
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 100%; height: 100%; background: #0b0f1a; }
  .plate { width: 100%; height: 100%; background-position: center; background-size: cover; position: relative; }
`;

/**
 * The wordmark: Unbounded 900 in the white → lavender answer gradient, a stacked violet extrusion and a soft
 * aurora glow, so it sits with the other games' dimensional logos. SVG text (CSS background-clip plus
 * drop-shadow draws a box glow).
 */
const wordmark = (width: number, size: number, stacked: boolean) => {
  const lines = stacked ? ["TRIVIA", "JAM"] : ["TRIVIA JAM"];
  const lineH = size * 1.02;
  const height = Math.round(lineH * lines.length + size * 0.9);
  const depth = Math.max(3, Math.round(size / 18));
  const text = (fill: string, dy: number, extra = "") =>
    lines
      .map(
        (l, i) =>
          `<text x="${width / 2}" y="${size * 1.15 + i * lineH + dy}" text-anchor="middle" font-family="Unbounded" font-weight="900" font-size="${size}" letter-spacing="${size * 0.02}" fill="${fill}" ${extra}>${l}</text>`,
      )
      .join("");
  const extrusion = Array.from({ length: depth }, (_, k) => text(k === depth - 1 ? "#1e1b4b" : "#4c1d95", depth - k)).join("");
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e0d7ff"/><stop offset="1" stop-color="#c084fc"/>
      </linearGradient>
      <filter id="glow" filterUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">
        <feDropShadow dx="0" dy="${depth + 4}" stdDeviation="${size / 12}" flood-color="#000" flood-opacity=".55"/>
        <feDropShadow dx="0" dy="0" stdDeviation="${size / 6}" flood-color="#a855f7" flood-opacity=".55"/>
      </filter>
    </defs>
    <g filter="url(#glow)">${extrusion}${text("url(#face)", 0, "")}</g>
  </svg>`;
};

const pages: { name: string; w: number; h: number; html: string; transparent?: boolean }[] = [
  { name: "hero-clean", w: 1920, h: 1080, html: `<div class="plate" style="background-image:url(${paint("hero-clean")})"></div>` },
  { name: "alt", w: 1920, h: 1080, html: `<div class="plate" style="background-image:url(${paint("alt")})"></div>` },
  { name: "icon", w: 512, h: 512, html: `<div class="plate" style="background-image:url(${paint("icon")})"></div>` },
  {
    name: "cover",
    w: 600,
    h: 900,
    html: `<div class="plate" style="background-image:url(${paint("cover-art")})">
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,15,26,.55),transparent 42%)"></div>
      <div style="position:absolute;top:58px;left:0;right:0;display:flex;justify-content:center">${wordmark(600, 96, true)}</div></div>`,
  },
  {
    name: "logo",
    w: 1400,
    h: 700,
    transparent: true,
    html: `<div style="width:1400px;height:700px;display:grid;place-items:center;background:transparent">${wordmark(1400, 230, true)}</div>`,
  },
];

const browser = await chromium.launch({ channel: "chrome" });
for (const p of pages) {
  const page = await browser.newPage({ viewport: { width: p.w, height: p.h } });
  await page.setContent(`<!doctype html><html><head><style>${base}${p.transparent ? "html,body{background:transparent}" : ""}</style></head><body>${p.html}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${p.name}.raw.png`, omitBackground: p.transparent === true });
  await page.close();
  console.log(`rendered ${p.name}`);
}
await browser.close();
