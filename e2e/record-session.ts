/**
 * Critic evidence: plays a whole game of Trivia Jam through the real UI and records it.
 *   TV (the /spectate page, 1920x1080) | host phone (grown-up, iPhone 15) | kid iPad (landscape)
 * plus two off-camera players, stitched side by side with the TV's audio (if the TV exposes a tap).
 *
 *   TJ_URL=http://127.0.0.1:3000 TJ_OUT=critic/rounds/00/session.mp4 pnpm exec tsx e2e/record-session.ts
 *
 * Writes recordings/raw/: per-panel videos, shots/<phase>-<screen>.png at CSS scale, marks.json, perf.json.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, devices, type BrowserContextOptions, type Page } from "playwright";

const BASE = process.env.TJ_URL ?? "http://127.0.0.1:3000";
const RAW = "recordings/raw";
const SHOTS = `${RAW}/shots`;
const OUT = process.env.TJ_OUT ?? "recordings/trivia-jam-session.mp4";
const FONT = "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A fixed question set, the same every round: numbers a family can guess, one multiple choice. */
const QUESTIONS = `How many legs does a spider have?
8

How many days are in a week?
7

How many teeth does a grown-up have?
32

Which animal is the biggest?
a) Elephant b) Blue whale c) Giraffe d) Hippo
Correct answer: B

How many minutes are in an hour?
60`;

/** The same questions, already parsed: the rig never depends on the live Gemini API. */
const PARSED = {
  q1: { id: "q1", text: "How many legs does a spider have?", correctAnswer: 8, questionType: "numeric" },
  q2: { id: "q2", text: "How many days are in a week?", correctAnswer: 7, questionType: "numeric" },
  q3: { id: "q3", text: "How many teeth does a grown-up have?", correctAnswer: 32, questionType: "numeric" },
  q4: { id: "q4", text: "Which animal is the biggest?", correctAnswer: "Blue whale", questionType: "multiple-choice", options: ["Elephant", "Blue whale", "Giraffe", "Hippo"] },
  q5: { id: "q5", text: "How many minutes are in an hour?", correctAnswer: 60, questionType: "numeric" },
};

/** Swaps the host's PARSE_QUESTIONS for QUESTIONS_PARSED on the wire (no game code involved). */
async function stubParsing(page: Page) {
  await page.routeWebSocket(/\/api\//, (ws) => {
    const server = ws.connectToServer();
    ws.onMessage((message) => {
      const text = typeof message === "string" ? message : message.toString();
      const isParse = text.includes('"PARSE_QUESTIONS"');
      server.send(isParse ? JSON.stringify({ type: "QUESTIONS_PARSED", questions: PARSED }) : text);
    });
  });
}

/** Answers per question for [kid, mom, grandpa]: some exact, some close, some wrong. */
const ANSWERS: string[][] = [
  ["8", "8", "6"],
  ["7", "7", "7"],
  ["20", "32", "30"],
  ["Blue whale", "Blue whale", "Elephant"],
  ["100", "60", "60"],
];

const marks: { label: string; t: number }[] = [];
let t0 = 0;
const mark = (label: string) => {
  marks.push({ label, t: Math.round((Date.now() - t0) / 100) / 10 });
  console.log(`[${marks.at(-1)?.t}s] ${label}`);
};

function asContext(name: string, landscape = false): BrowserContextOptions & { viewport: { width: number; height: number } } {
  const d = devices[name];
  if (!d) throw new Error(`unknown device ${name}`);
  const { defaultBrowserType: _ignored, ...opts } = d;
  const viewport = landscape ? { width: d.viewport.height, height: d.viewport.width } : d.viewport;
  return { ...opts, viewport };
}

/** Layout facts per shot, read from the DOM: the smallest visible text, and anything cut off by the viewport. */
type Layout = { minFontPx: number; smallTextSamples: string[]; clipped: string[]; truncated: string[] };
const layouts: Record<string, Layout> = {};

async function measure(page: Page): Promise<Layout> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let minFontPx = Infinity;
    const small: { px: number; text: string }[] = [];
    const clipped: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? "").trim();
      const el = n.parentElement;
      if (!text || !el) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || Number(style.opacity) === 0) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const box = range.getBoundingClientRect();
      // What is actually visible: the text box cut by every ancestor that clips (truncate, scroll areas).
      let r = { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
      for (let a: HTMLElement | null = el; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
        const c = a.getBoundingClientRect();
        const left = Math.max(r.left, c.left), top = Math.max(r.top, c.top), right = Math.min(r.right, c.right), bottom = Math.min(r.bottom, c.bottom);
        r = { left, top, right, bottom, width: right - left, height: bottom - top };
      }
      if (r.width < 1 || r.height < 1) continue;
      const onScreen = r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
      if (!onScreen) continue;
      const px = parseFloat(style.fontSize);
      if (px < minFontPx) minFontPx = px;
      small.push({ px, text: text.slice(0, 40) });
      // Cut off: text that starts inside the screen but runs past an edge (scrolling content is fine).
      if (r.top < -2 || r.left < -2 || r.right > vw + 2) clipped.push(`${text.slice(0, 40)} (${Math.round(r.left)},${Math.round(r.top)})`);
    }
    small.sort((a, b) => a.px - b.px);
    // Text cut short inside its own box (ellipsis or overflow:hidden): "Gra..." passes the edge check.
    const truncated: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || el.offsetParent === null) continue;
      const clips = cs.textOverflow === "ellipsis" || cs.overflowX === "hidden" || cs.overflowX === "clip";
      const text = (el.textContent ?? "").trim();
      if (!clips || !text || el.children.length > 0 || el.clientWidth <= 2) continue;
      if (el.scrollWidth > el.clientWidth + 1) truncated.push(text.slice(0, 40));
    }
    return {
      minFontPx: Number.isFinite(minFontPx) ? minFontPx : 0,
      smallTextSamples: small.slice(0, 4).map((s) => `${s.px}px "${s.text}"`),
      clipped: clipped.slice(0, 6),
      truncated: truncated.slice(0, 6),
    };
  });
}

async function shoot(phase: string, screens: Record<string, Page>) {
  for (const [name, page] of Object.entries(screens)) {
    await page.screenshot({ path: `${SHOTS}/${phase}-${name}.png` }).catch((e: unknown) => console.log(`shot ${phase}-${name} failed: ${String(e).slice(0, 120)}`));
    layouts[`${phase}-${name}`] = await measure(page).catch(() => ({ minFontPx: 0, smallTextSamples: [], clipped: ["measure failed"], truncated: [] }));
  }
}

/** TJ_FAULT forces a known-bad build so the checks can be shown to fail: black | tiny | clip | mute. */
const FAULT = process.env.TJ_FAULT ?? "";
const FAULT_CSS: Record<string, string> = {
  black: "html, body { filter: brightness(0) !important; }",
  tiny: "body * { font-size: 9px !important; }",
  clip: "body { margin-top: -120px !important; }",
  white: "html, body { filter: brightness(20) !important; }",
};

/**
 * Records a page with Chrome's own screencast. Each frame carries its real swap time, so the panel can be
 * rebuilt at true wall-clock timing (Playwright's recordVideo stamps frames on arrival, and a busy 1080p page
 * drifted up to 12 s behind the marks by the end of a game).
 */
const even = (n: number) => Math.ceil(n / 2) * 2;

async function startScreencast(page: Page, dir: string, size: { width: number; height: number }) {
  mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames: { path: string; t: number; arrived: number }[] = [];
  cdp.on("Page.screencastFrame", (f) => {
    const path = `${dir}/${String(frames.length).padStart(6, "0")}.jpg`;
    writeFileSync(path, Buffer.from(f.data, "base64"));
    const arrived = Date.now() / 1000;
    frames.push({ path, t: f.metadata.timestamp ?? arrived, arrived });
    void cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => undefined);
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: size.width, maxHeight: size.height, everyNthFrame: 1 });
  const startedAt = Date.now();
  return {
    startedAt,
    /** Stops and writes <dir>.mp4 whose time 0 is startedAt, each frame held until the next one swapped. */
    async stop(): Promise<string> {
      const stoppedAt = Date.now();
      await cdp.send("Page.stopScreencast").catch(() => undefined);
      if (frames.length === 0) throw new Error(`no screencast frames for ${dir}`);
      // Frames are placed by arrival time. The screencast's own timestamps proved unreliable (per-page
      // bases that differed by seconds); arrival is close to real time because Chrome sends the next
      // frame only after the previous one is acked, so no backlog builds.
      for (const f of frames) f.t = f.arrived;
      // Resample onto an exact 30 fps grid: output frame k (time k/30 from startedAt) is the latest frame
      // that had swapped by then. (The concat demuxer rounds each duration to its 1/25 s timebase, which
      // made one run's panes 3.4 s short and 8.3 s long.)
      const FPS = 30;
      const grid = `${dir}/grid`;
      mkdirSync(grid, { recursive: true });
      const total = Math.ceil(((stoppedAt - startedAt) / 1000) * FPS);
      let j = 0;
      for (let k = 0; k < total; k++) {
        const at = startedAt / 1000 + k / FPS;
        while (j + 1 < frames.length && (frames[j + 1]?.t ?? Infinity) <= at) j++;
        const src = frames[j]?.path;
        if (src) symlinkSync(resolve(src), `${grid}/${String(k).padStart(6, "0")}.jpg`);
      }
      const out = `${dir}.mp4`;
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", `${grid}/%06d.jpg`,
        // Even output size (yuv420p), every frame scaled to it (screencast frames can change size mid-run).
        "-vf", `scale=${even(size.width)}:${even(size.height)}:force_original_aspect_ratio=decrease:eval=frame,pad=${even(size.width)}:${even(size.height)}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
        "-c:v", "libx264", "-crf", "18", out]);
      return out;
    },
  };
}

/** On a stall: what is each page actually showing? */
async function dump(screens: Record<string, Page>) {
  for (const [name, page] of Object.entries(screens)) {
    const text = await page.locator("body").innerText().catch(() => "");
    console.log(`--- ${name} ---\n${text.slice(0, 600)}`);
  }
}

async function answer(page: Page, value: string) {
  // Multiple-choice tiles are named "A) option"; a digit key on the pad must never count as one.
  const option = page.getByRole("button", { name: new RegExp(`^[A-D]\\) ${value}$`) });
  if (await option.count()) {
    await option.first().click({ force: true, timeout: 3000 });
    return;
  }
  // Tapped on the on-screen number pad, key by key, the way a kid does it.
  const pad = page.getByRole("group", { name: /number pad/i });
  await pad.waitFor({ timeout: 10_000 });
  for (const digit of value) {
    await pad.getByRole("button", { name: digit, exact: true }).click({ force: true, timeout: 3000 });
    await wait(260);
  }
  // force: the GO key pulses while it's ready, so it is never "stable" for Playwright.
  await page.getByRole("button", { name: /submit/i }).click({ force: true, timeout: 3000 });
}

async function main() {
  rmSync(RAW, { recursive: true, force: true });
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--autoplay-policy=no-user-gesture-required", "--use-angle=metal", "--enable-gpu", "--disable-audio-output"],
  });

  const recorded = [
    { key: "tv", label: "TV", opts: { viewport: { width: 1920, height: 1080 } } },
    { key: "host", label: "Grown-up phone (host)", opts: asContext("iPhone 15") },
    { key: "kid", label: "Kid iPad (landscape)", opts: asContext("iPad (gen 7)", true) },
  ];
  const pages: Page[] = [];
  const startedAt: number[] = [];
  const casts: Awaited<ReturnType<typeof startScreencast>>[] = [];
  for (const s of recorded) {
    const ctx = await browser.newContext({ ...s.opts });
    const page = await ctx.newPage();
    await page.setContent('<body style="margin:0;background:#111;height:100vh"></body>');
    const cast = await startScreencast(page, `${RAW}/cast-${s.key}`, s.opts.viewport);
    casts.push(cast);
    startedAt.push(cast.startedAt);
    page.on("pageerror", (e) => console.log(`[pageerror ${s.key}] ${e.message.slice(0, 300)}`));
    pages.push(page);
  }
  const [tv, host, kid] = pages;
  if (!tv || !host || !kid) throw new Error("pages missing");
  const offCamera = async () => (await browser.newContext(asContext("iPhone 15"))).newPage();
  const mom = await offCamera();
  const grandpa = await offCamera();
  const screens = { tv, host, kid };
  t0 = Math.max(...startedAt); // the stitched video starts when the last panel started recording

  const faults = FAULT.split(",");
  const faultCss = faults.map((f) => FAULT_CSS[f] ?? "").join("\n").trim();
  if (faultCss) for (const p of [tv, host, kid]) await p.addInitScript(`addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = ${JSON.stringify(faultCss)}; document.head.append(s); });`);
  if (faults.includes("jank")) await tv.addInitScript(`const burn = () => { const t = performance.now(); while (performance.now() - t < 30) {} requestAnimationFrame(burn); }; requestAnimationFrame(burn);`);
  // mute: nothing reaches the recording tap (the TV's mix is silent as captured).
  if (faults.includes("mute")) await tv.addInitScript(`{ const connect = AudioNode.prototype.connect; AudioNode.prototype.connect = function (dest, ...rest) { if (dest instanceof MediaStreamAudioDestinationNode) return dest; return connect.call(this, dest, ...rest); }; }`);

  // The kid's iPad records its own pointer-down time, so latency is press -> TV, not Playwright overhead.
  await kid.addInitScript(`document.addEventListener("pointerdown", () => { window.__pressAt = Date.now(); }, true);`);
  const frameCollector = `window.__frames = []; let last = performance.now();
    const tick = (t) => { window.__frames.push(t - last); last = t; requestAnimationFrame(tick); }; requestAnimationFrame(tick);`;
  await tv.addInitScript(frameCollector);
  await kid.addInitScript(frameCollector);

  try {
    // Host creates a game.
    if (process.env.TJ_LIVE_GEMINI !== "1") await stubParsing(host);
    await host.goto(BASE);
    await host.getByRole("link", { name: /create new game/i }).waitFor({ timeout: 15_000 });
    await wait(800);
    await shoot("00-home", { host });
    await host.getByRole("link", { name: /create new game/i }).click();
    await host.waitForURL(/\/games\/[a-z0-9-]+/i);
    const gamePath = new URL(host.url()).pathname;
    const gameUrl = `${BASE}${gamePath}`;
    await tv.goto(`${BASE}${gamePath.replace(/^\/games\//, "/spectate/")}?record=1&hook=1`);
    // If the TV exposes an audio tap, record it.
    const hasTap = await tv
      .waitForFunction(() => typeof Reflect.get(window, "__tvAudioTap") === "function", null, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (hasTap) {
      await tv.evaluate(`(() => {
        const rec = new MediaRecorder(window.__tvAudioTap(), { mimeType: "audio/webm;codecs=opus" });
        window.__chunks = []; rec.ondataavailable = (e) => window.__chunks.push(e.data); rec.start(250); window.__rec = rec;
      })()`);
    }
    const audioStartedAt = Date.now();
    mark("lobby");
    await wait(2500);
    await shoot("01-lobby-empty", { tv, host });

    // Host imports the fixed questions.
    await host.locator("textarea").fill(QUESTIONS);
    await host.getByRole("button", { name: /^submit( questions)?$/i }).click();
    mark("host imports questions");
    await wait(1200);
    await shoot("02-parsing", { host });
    await host.getByTestId("parsed-question-5").waitFor({ timeout: 60_000 });
    mark("questions ready");

    // Everyone joins from the link.
    const join = async (page: Page, name: string) => {
      await page.goto(gameUrl);
      await page.getByLabel(/your name/i).waitFor({ timeout: 10_000 });
      await page.getByLabel(/your name/i).pressSequentially(name, { delay: 120 });
      await page.getByRole("button", { name: /join game/i }).click();
    };
    await kid.goto(gameUrl);
    await wait(800);
    await shoot("03-join", { kid });
    await join(kid, "Sam");
    mark("kid joined");
    await wait(1200);
    await join(mom, "Mom");
    await join(grandpa, "Grandpa");
    mark("everyone joined");
    await wait(1500);
    await shoot("04-lobby-full", { tv, host, kid });

    await host.getByRole("button", { name: /start game/i }).click();
    mark("game started");
    await wait(1500);

    for (let q = 0; q < ANSWERS.length; q++) {
      const start = host.getByRole("button", { name: /start.*question|next.*question/i });
      await start.waitFor({ timeout: 40_000 });
      await shoot(`1${q}a-before-q${q + 1}`, { tv, host, kid });
      await start.click();
      mark(`question ${q + 1}`);
      await kid.getByTestId("question-timer").waitFor({ timeout: 10_000 });
      await wait(1500);
      await shoot(`1${q}b-q${q + 1}-asked`, { tv, host, kid });
      const answers = ANSWERS[q] ?? [];
      // The kid thinks; grown-ups answer at their own pace.
      await wait(2500);
      await answer(mom, answers[1] ?? "1");
      await wait(1500);
      await answer(kid, answers[0] ?? "1");
      mark(`kid answers q${q + 1}`);
      await wait(600);
      await shoot(`1${q}c-q${q + 1}-kid-answered`, { tv, host, kid });
      await wait(1200);
      await answer(grandpa, answers[2] ?? "1");
      // Everyone answered: results come up (auto-advance) or after the timer.
      await wait(2500);
      mark(`results q${q + 1}`);
      await shoot(`1${q}d-q${q + 1}-results`, { tv, host, kid });
      // The TV stages its reveal over ~10 s: shoot the answer landing and the standings that follow.
      await wait(4500);
      await shoot(`1${q}e-q${q + 1}-reveal-settled`, { tv });
      await wait(5000);
      mark(`standings q${q + 1}`);
      await shoot(`1${q}f-q${q + 1}-standings`, { tv });
      await wait(1000);
    }

    // The last question ends the game (or the host ends it).
    const over = tv.getByTestId("game-over-title");
    if (!(await over.count())) {
      const end = host.getByTestId("end-game-button");
      if (await end.count()) await end.click({ timeout: 3000 }).catch(() => undefined);
    }
    await over.waitFor({ timeout: 40_000 }).catch(() => undefined);
    mark("game over");
    await wait(2500);
    await shoot("20-game-over", { tv, host, kid });
    // The TV stages its finale (podium, winner takeover, awards) over ~11 s.
    await wait(9500);
    await shoot("21-game-over-settled", { tv, host, kid });
    await wait(3000);
    mark("end");

    const rawFrames: unknown = await tv.evaluate(() => Reflect.get(window, "__frames"));
    const frames = Array.isArray(rawFrames) ? rawFrames.filter((x): x is number => typeof x === "number") : [];
    const sorted = frames.slice(60).sort((a, b) => a - b);
    const at = (p: number) => Math.round((sorted[Math.floor(p * (sorted.length - 1))] ?? 0) * 10) / 10;
    const pressAt: unknown = await kid.evaluate(() => Reflect.get(window, "__pressAt"));
    // The kid's iPad page too: heavy compositing there shows up as frame time (and as lag in its video pane).
    const kidRaw: unknown = await kid.evaluate(() => Reflect.get(window, "__frames"));
    const kidFrames = (Array.isArray(kidRaw) ? kidRaw.filter((x): x is number => typeof x === "number") : []).slice(60).sort((a, b) => a - b);
    const kidAt = (p: number) => Math.round((kidFrames[Math.floor(p * (kidFrames.length - 1))] ?? 0) * 10) / 10;
    writeFileSync(`${RAW}/perf.json`, JSON.stringify({ frames: sorted.length, p50: at(0.5), p95: at(0.95), p99: at(0.99), max: at(1), lastKidPressAt: pressAt, kid: { frames: kidFrames.length, p50: kidAt(0.5), p95: kidAt(0.95), max: kidAt(1) } }, null, 2));

    const audioPath = `${RAW}/tv-audio.webm`;
    if (hasTap) {
      const b64 = await tv.evaluate<string>(`new Promise((resolve) => {
        window.__rec.onstop = () => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1] ?? ""); r.readAsDataURL(new Blob(window.__chunks, { type: "audio/webm" })); };
        window.__rec.stop();
      })`);
      writeFileSync(audioPath, Buffer.from(b64, "base64"));
    } else {
      writeFileSync(audioPath, "");
      console.error("NO TV AUDIO: the TV page exposes no audio tap (window.__tvAudioTap). The video is silent.");
    }

    const videos = await Promise.all(casts.map((c) => c.stop()));
    await Promise.all(pages.map((p) => p.context().close()));
    await browser.close();
    writeFileSync(`${RAW}/marks.json`, JSON.stringify({ videos, startedAt, audio: audioPath, hasAudio: hasTap, fault: FAULT || null, marks }, null, 2));
    writeFileSync(`${RAW}/layout.json`, JSON.stringify(layouts, null, 2));
    stitch(videos, recorded.map((s) => s.label), startedAt, { path: audioPath, startedAt: audioStartedAt });
    console.log(`\nSaved ${OUT}`);
  } catch (err) {
    console.error("STALL:", err);
    await shoot("stall", screens);
    await dump({ ...screens, mom, grandpa });
    await browser.close();
    process.exit(1);
  }
}

/** Aligns the recordings in wall-clock time and lays them out side by side, 720px tall. */
function stitch(videos: string[], labels: string[], startedAt: number[], audio: { path: string; startedAt: number }) {
  const H = 720;
  const last = Math.max(...startedAt);
  const inputs = videos.flatMap((v, i) => ["-ss", ((last - (startedAt[i] ?? last)) / 1000).toFixed(3), "-i", v]);
  const panels = labels.map((label, i) => {
    const text = label.replace(/:/g, "\\:");
    return `[${i}:v]scale=-2:${H},pad=iw+24:ih+64:12:64:color=0x111111,drawtext=fontfile='${FONT}':text='${text}':fontcolor=0xeeeeee:fontsize=28:x=(w-tw)/2:y=18[p${i}]`;
  });
  const filter = `${panels.join(";")};${labels.map((_, i) => `[p${i}]`).join("")}hstack=inputs=${labels.length}:shortest=1,pad=ceil(iw/2)*2:ceil(ih/2)*2[out]`;
  const heard = statSync(audio.path).size > 0;
  const audioIn = heard
    ? ["-itsoffset", ((audio.startedAt - last) / 1000).toFixed(3), "-i", audio.path]
    : ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"];
  execFileSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", ...inputs, ...audioIn, "-filter_complex", filter, "-map", "[out]", "-map", `${videos.length}:a`,
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-r", "30", "-c:a", "aac", "-b:a", "192k", ...(heard ? [] : ["-shortest"]), OUT],
    { stdio: "inherit" },
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
