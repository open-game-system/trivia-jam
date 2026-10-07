/**
 * Chaos harness (this comment is its README).
 *
 * A seeded, randomized multi-device run against `pnpm e2e:serve` (mock LLM: two questions, q1
 * numeric "What is 2 + 2?" = 4, q2 multiple choice, Blue). Per seed: the host opens a room with the
 * questions, a TV opens /spectate, 3-5 phones join, then 25-40 random actions that lean on leaving:
 * tabs and contexts closed mid-lobby/question/reveal, reloads, back/forward, "/" and back, rejoins
 * under the same name with a new identity, second tabs, network drops (sockets closed, answers
 * queued while offline), rapid GO taps, the host reloading/closing/removing/skipping/ending, the TV
 * reloading/closing, waiting out the timer. After every action the invariants below are checked
 * against the server's own snapshot (oracle.ts) and every open screen; violations are collected
 * (not thrown) and the seed fails at the end with all of them. Then the host must be able to drive
 * the game to the final standings, on the host, the TV and every connected phone.
 *
 * Run:   PLAYWRIGHT_BASE_URL=http://localhost:3101 pnpm exec playwright test e2e/chaos/chaos.spec.ts --project=chromium --retries=0
 * Env:   CHAOS_SEEDS="1,2,3" (or a count, default 6 -> seeds 1..6), CHAOS_ACTIONS (max actions, default
 *        random 25-40 per seed), CHAOS_ANSWER_SECONDS (default 20), CHAOS_BUDGET_MS (action phase, default 130000).
 * Every action is logged as "[seed S #i] ..." and attached (action-log); a failing seed replays exactly.
 */
import { writeFileSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { createGame, seedQuestions } from "../helpers/game-setup";
import { setAnswerTime } from "../helpers/play";
import {
  closeDevice,
  goOffline,
  goOnline,
  mulberry32,
  newDevice,
  openPage,
  sleep,
  type Device,
  type Recorder,
  type Rng,
} from "./devices";
import { fetchServerSnapshot, stateName, type ServerSnapshot } from "./oracle";

const seedsEnv = process.env.CHAOS_SEEDS ?? "6";
const SEEDS = seedsEnv.includes(",")
  ? seedsEnv.split(",").filter((s) => s.trim() !== "").map((s) => Number(s.trim()))
  : Array.from({ length: Number(seedsEnv) }, (_, i) => i + 1);
const ANSWER_SECONDS = Number(process.env.CHAOS_ANSWER_SECONDS ?? 20);
const BUDGET_MS = Number(process.env.CHAOS_BUDGET_MS ?? 130_000);
const NAMES = ["Ada", "Ben", "Cy", "Dot", "Eve", "Fin", "Gus", "Hal", "Ivy", "Jo"];

type Player = Device & { name: string; id: string | null };

type Phase = "lobby" | "question" | "prep" | "finished" | "unknown";
const phaseOf = (s: ServerSnapshot): Phase => {
  const name = stateName(s);
  if (name.startsWith("lobby")) return "lobby";
  if (name.includes("questionActive")) return "question";
  if (name.includes("questionPrep")) return "prep";
  if (name.startsWith("finished")) return "finished";
  return "unknown";
};

/** Reads a short text without waiting the default 10 s. */
const quickText = (page: Page, re: RegExp) =>
  page
    .getByText(re)
    .first()
    .textContent({ timeout: 800 })
    .catch(() => null);

const visible = (locator: ReturnType<Page["getByText"]>) => locator.first().isVisible().catch(() => false);

class Chaos {
  readonly log: string[] = [];
  readonly violations: { at: number; action: string; message: string }[] = [];
  readonly seen = new Set<string>();
  readonly players: Player[] = [];
  readonly expectedSeated = new Set<string>();
  readonly lastScore = new Map<string, number>();
  host!: Device;
  tv!: Device;
  gamePath = "";
  index = -1;
  currentAction = "setup";
  nameCounter = 0;

  constructor(
    readonly browser: Browser,
    readonly baseURL: string,
    readonly seed: number,
    readonly rng: Rng,
  ) {}

  rec: Recorder = {
    note: (line) => this.note(line),
    pageProblem: (device, kind, text) =>
      // The shared e2e server gets rebuilt by other work; a stale asset hash is environment noise.
      /Failed to fetch dynamically imported module|Importing a module script failed/.test(text)
        ? this.note(`ENV NOISE (server rebuilt?): ${kind} on ${device}: ${text}`)
        : this.violate(`${kind} on ${device}: ${text}`),
  };

  note(line: string) {
    const entry = `[seed ${this.seed} #${this.index}] ${line}`;
    this.log.push(entry);
    console.log(entry);
  }

  violate(message: string) {
    // Same message from the same root cause is reported once, at the first action that showed it.
    const key = message.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "<id>");
    if (this.seen.has(key)) return;
    this.seen.add(key);
    this.violations.push({ at: this.index, action: this.currentAction, message });
    this.note(`VIOLATION: ${message}`);
  }

  get tvPath() {
    return this.gamePath.replace("/games/", "/spectate/");
  }

  async snap() {
    return fetchServerSnapshot(this.baseURL, this.gamePath);
  }

  hostPage() {
    return this.host.pages[0];
  }

  tvPage() {
    return this.tv.pages[0];
  }

  label(p: Player) {
    return `${p.name}(${p.id?.slice(0, 4) ?? "-"})`;
  }

  // ---------- setup ----------

  async setup() {
    const { hostPage, hostContext, gamePath } = await createGame(this.browser);
    // The host's first context has no socket routing; swap to a routed device on the same cookies.
    const state = await hostContext.storageState();
    await hostContext.close();
    this.gamePath = gamePath;
    void hostPage;
    this.host = await newDevice(this.browser, "host");
    await this.host.context.addCookies(state.cookies);
    const hp = await openPage(this.host, gamePath, this.rec);
    await expect(hp.getByRole("heading", { name: "Game Setup" })).toBeVisible({ timeout: 15_000 });
    await seedQuestions(hp);
    await setAnswerTime(hp, ANSWER_SECONDS);
    this.tv = await newDevice(this.browser, "tv");
    const tvp = await openPage(this.tv, this.tvPath, this.rec);
    await expect(tvp.getByText("Waiting for game to start")).toBeVisible({ timeout: 15_000 });
    const count = this.rng.int(3, 5);
    for (let i = 0; i < count; i++) await this.join(this.freshName());
  }

  freshName() {
    return NAMES[this.nameCounter++ % NAMES.length] + (this.nameCounter > NAMES.length ? String(this.nameCounter) : "");
  }

  /** A new identity (new context) joins under `name`. */
  async join(name: string, existing?: Player) {
    const before = new Set((await this.snap()).public.players.map((p) => p.id));
    const device = existing ?? (await newDevice(this.browser, name));
    const player: Player = existing ?? Object.assign(device, { name, id: null });
    if (!existing) this.players.push(player);
    const page = player.pages[0] ?? (await openPage(player, this.gamePath, this.rec));
    const form = page.getByRole("heading", { name: "Join Game" });
    await expect(form).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Your Name").fill(name);
    await page.getByRole("button", { name: "Join Game" }).click();
    let id: string | null = null;
    await expect
      .poll(
        async () => {
          const s = await this.snap();
          id = s.public.players.find((p) => !before.has(p.id) && p.name === name)?.id ?? null;
          return id;
        },
        { timeout: 15_000 },
      )
      .not.toBeNull()
      .catch(() => this.violate(`join: ${name} tapped Join Game but no seat appeared on the server`));
    if (id) {
      player.id = id;
      this.expectedSeated.add(id);
      this.lastScore.set(id, 0);
    }
    return player;
  }

  // ---------- invariants ----------

  async check(): Promise<string[]> {
    const problems: string[] = [];
    let s: ServerSnapshot;
    try {
      s = await this.snap();
    } catch (error) {
      return [`oracle: server snapshot unavailable: ${String(error)}`];
    }
    const phase = phaseOf(s);
    const pub = s.public;
    const ids = pub.players.map((p) => p.id);
    if (new Set(ids).size !== ids.length) problems.push(`server: duplicate player ids ${JSON.stringify(ids)}`);
    for (const id of this.expectedSeated)
      if (!ids.includes(id)) {
        const p = this.players.find((x) => x.id === id);
        problems.push(`server: ${p ? this.label(p) : id} lost their seat (no removal)`);
      }
    for (const p of pub.players)
      if (!this.expectedSeated.has(p.id)) problems.push(`server: unexpected seat ${p.name}(${p.id.slice(0, 4)})`);
    for (const p of pub.players) {
      const last = this.lastScore.get(p.id);
      if (last !== undefined && p.score < last) problems.push(`server: ${p.name} score went down ${last} -> ${p.score}`);
    }
    const answers = pub.currentQuestion?.answers ?? [];
    const answeredIds = new Set(answers.map((a) => a.playerId));
    if (answeredIds.size !== answers.length)
      problems.push(
        `server: a player has more than one answer to ${pub.currentQuestion?.questionId}: ${JSON.stringify(answers.map((a) => [a.playerId.slice(0, 4), a.value]))}`,
      );
    for (const id of answeredIds)
      if (!ids.includes(id)) problems.push(`server: answer from a player who is not seated (${id.slice(0, 4)})`);
    for (const r of pub.questionResults) {
      const rid = r.answers.map((a) => a.playerId);
      if (new Set(rid).size !== rid.length) problems.push(`server: result ${r.questionId} holds duplicate answers from one player`);
    }

    // Host screen.
    const hp = this.hostPage();
    if (hp && !this.host.net.offline) {
      problems.push(...(await this.screenBasics(hp, "host")));
      if (phase === "lobby") {
        const heading = await hp
          .getByRole("heading", { name: /^Players \(\d+\/\d+\)$/ })
          .first()
          .textContent({ timeout: 800 })
          .catch(() => null);
        const n = Number(heading?.match(/\((\d+)\//)?.[1]);
        if (heading === null) problems.push("host: no Players (n/max) heading in the lobby");
        else if (n !== ids.length) problems.push(`host: Players (${n}/..) but the server has ${ids.length}`);
        const rows = await hp.getByRole("region", { name: /^Players \(/ }).getByRole("listitem").count();
        if (rows !== ids.length) problems.push(`host: ${rows} player rows but the server has ${ids.length}`);
      }
      if (phase === "question") {
        const t = await quickText(hp, /^Answers Submitted: \d+ \/ \d+$/);
        const m = t?.match(/(\d+) \/ (\d+)/);
        if (!m) problems.push("host: no Answers Submitted line during the question");
        else {
          const [a, p] = [Number(m[1]), Number(m[2])];
          if (a > p) problems.push(`host: Answers Submitted ${a} / ${p} (more answers than players)`);
          if (p !== ids.length) problems.push(`host: Answers Submitted ../${p} but ${ids.length} seated`);
          if (a !== answeredIds.size) problems.push(`host: Answers Submitted ${a} but ${answeredIds.size} players answered`);
        }
      }
      if (phase === "finished" && !(await visible(hp.getByRole("heading", { name: "Game Over!" }))))
        problems.push("host: game is finished on the server but the host has no Game Over!");
    }

    // TV.
    const tp = this.tvPage();
    if (tp && !this.tv.net.offline) {
      problems.push(...(await this.screenBasics(tp, "tv")));
      if (phase === "lobby") {
        const t = await quickText(tp, /^(\d+ players?|Waiting for players)$/);
        const n = t === "Waiting for players" ? 0 : Number(t?.match(/^(\d+)/)?.[1]);
        if (t === null) problems.push("tv: no player count in the lobby");
        else if (n !== ids.length) problems.push(`tv: lobby says "${t}" but the server has ${ids.length}`);
        const names = new Map<string, number>();
        for (const p of pub.players) names.set(p.name, (names.get(p.name) ?? 0) + 1);
        for (const [name, count] of names) {
          const shown = await tp.getByText(name, { exact: true }).count();
          if (shown !== count) problems.push(`tv: ${shown} seats named ${name}, server has ${count}`);
        }
      }
      if (phase === "question") {
        const t = await quickText(tp, /^Answers Submitted: \d+ \/ \d+$/);
        const m = t?.match(/(\d+) \/ (\d+)/);
        if (m) {
          const [a, p] = [Number(m[1]), Number(m[2])];
          if (a > p) problems.push(`tv: Answers Submitted ${a} / ${p}`);
          if (p !== ids.length) problems.push(`tv: Answers Submitted ../${p} but ${ids.length} seated`);
          if (a !== answeredIds.size) problems.push(`tv: Answers Submitted ${a} but ${answeredIds.size} answered`);
        }
      }
    }

    // Phones.
    for (const pl of this.players) {
      if (pl.contextClosed || pl.net.offline) continue;
      const seated = pl.id !== null && ids.includes(pl.id);
      for (const [i, page] of pl.pages.entries()) {
        const who = `${this.label(pl)}${i > 0 ? ` tab ${i + 1}` : ""}`;
        problems.push(...(await this.screenBasics(page, who)));
        const joinForm = await visible(page.getByRole("heading", { name: "Join Game" }));
        if (seated && joinForm) problems.push(`phone ${who}: seated on the server but shows the Join Game form`);
        if (!seated && pl.id && phase !== "finished" && !joinForm && this.everSeated(pl))
          problems.push(`phone ${who}: not seated (removed) but no Join Game form`);
        if (!seated) continue;
        if (phase === "lobby" && !(await visible(page.getByRole("heading", { name: `Welcome, ${pl.name}!` }))))
          problems.push(`phone ${who}: lobby without "Welcome, ${pl.name}!"`);
        if (phase === "question" && pl.id && answeredIds.has(pl.id)) {
          const locked = await visible(page.getByRole("status").filter({ hasText: "Answer Submitted!" }));
          if (!locked) problems.push(`phone ${who}: answered on the server but not locked in`);
        }
        if (phase === "question" && pl.id && !answeredIds.has(pl.id)) {
          const canAnswer =
            (await visible(page.getByRole("group", { name: "Number pad" }))) ||
            (await visible(page.getByRole("group", { name: "Choices" })));
          if (!canAnswer) problems.push(`phone ${who}: question is live and unanswered but no pad/choices`);
        }
        if (phase === "finished" && !(await visible(page.getByRole("heading", { name: "Game Over!" }))))
          problems.push(`phone ${who}: game finished but no Game Over!`);
      }
    }
    if (problems.length === 0) for (const p of pub.players) this.lastScore.set(p.id, p.score);
    return problems;
  }

  everSeated(pl: Player) {
    return pl.id !== null;
  }

  async screenBasics(page: Page, who: string) {
    const out: string[] = [];
    if (page.isClosed()) return out;
    if (await visible(page.getByText(/Something went wrong/))) out.push(`${who}: error boundary "Something went wrong"`);
    const text = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "<unreadable>");
    if (text.trim() === "") out.push(`${who}: blank page`);
    return out;
  }

  /** Converge: re-check for up to `ms`; whatever is still wrong is a violation. */
  async settle(ms = 7_000) {
    const until = Date.now() + ms;
    let problems: string[] = [];
    do {
      problems = await this.check();
      if (problems.length === 0) return;
      await sleep(500);
    } while (Date.now() < until);
    for (const p of problems) this.violate(p);
    // Accept the server's scores as the new baseline so one drop isn't reported forever.
    const s = await this.snap().catch(() => null);
    if (s) for (const p of s.public.players) this.lastScore.set(p.id, Math.max(p.score, this.lastScore.get(p.id) ?? 0));
  }

  // ---------- actions ----------

  livePlayers(filter: (p: Player) => boolean = () => true) {
    return this.players.filter((p) => !p.contextClosed && filter(p));
  }

  seatedIds(s: ServerSnapshot) {
    return new Set(s.public.players.map((p) => p.id));
  }

  async answerOn(page: Page, style: "normal" | "long" | "triple" | "empty") {
    const pad = page.getByRole("group", { name: "Number pad" });
    const choices = page.getByRole("group", { name: "Choices" });
    if (await visible(choices)) {
      const options = choices.getByRole("button");
      const n = await options.count();
      const pick = options.nth(this.rng.int(0, Math.max(0, n - 1)));
      if (style === "triple") await Promise.all([0, 1, 2].map(() => pick.click({ timeout: 1_500 }).catch(() => {})));
      else await pick.click({ timeout: 3_000 });
      return `choice (${style})`;
    }
    if (!(await visible(pad))) return "no pad";
    const digits =
      style === "long" ? String(this.rng.int(1, 9)) + "9".repeat(this.rng.int(8, 14)) : style === "empty" ? "" : String(this.rng.int(1, 12));
    for (const d of digits) await pad.getByRole("button", { name: d, exact: true }).click({ timeout: 3_000 });
    const go = pad.getByRole("button", { name: "Submit answer" });
    if (style === "triple") await Promise.all([0, 1, 2].map(() => go.click({ timeout: 1_500 }).catch(() => {})));
    else await go.click({ timeout: 1_500 }).catch(() => {});
    return `pad "${digits}" (${style})`;
  }

  async act(): Promise<string> {
    const s = await this.snap();
    const phase = phaseOf(s);
    const seated = this.seatedIds(s);
    const live = this.livePlayers();
    const withPages = live.filter((p) => p.pages.length > 0);
    const closedTabs = live.filter((p) => p.pages.length === 0);
    const seatedLive = withPages.filter((p) => p.id && seated.has(p.id));
    const answering = phase === "question" ? seatedLive.filter((p) => !s.public.currentQuestion?.answers.some((a) => a.playerId === p.id)) : [];
    const r = this.rng;

    type Option = [number, () => Promise<string>];
    const options: Option[] = [];
    const add = (w: number, when: boolean, f: () => Promise<string>) => {
      if (when && w > 0) options.push([w, f]);
    };

    add(3, withPages.length > 0, async () => {
      const p = r.pick(withPages);
      await Promise.all(p.pages.map((pg) => pg.close()));
      return `closeTab ${this.label(p)} (${phase})`;
    });
    add(3, closedTabs.length > 0, async () => {
      const p = r.pick(closedTabs);
      await openPage(p, this.gamePath, this.rec);
      return `reopenTab same cookies ${this.label(p)} (${phase})`;
    });
    add(1, live.length > 1, async () => {
      const p = r.pick(live);
      await closeDevice(p);
      if (p.id) this.note(`(${this.label(p)} is gone for good; their seat stays on the server)`);
      return `closeContext forever ${this.label(p)} (${phase})`;
    });
    add(4, withPages.length > 0, async () => {
      const p = r.pick(withPages);
      await p.pages[0].reload();
      return `reload ${this.label(p)} (${phase})`;
    });
    add(2, withPages.length > 0, async () => {
      const p = r.pick(withPages);
      const pg = p.pages[0];
      await pg.goto("/");
      await pg.goBack();
      await sleep(r.int(200, 1500));
      await pg.goForward();
      await pg.goBack();
      return `"/" then back, forward, back ${this.label(p)} (${phase})`;
    });
    add(2, withPages.length > 0, async () => {
      const p = r.pick(withPages);
      const pg = p.pages[0];
      await pg.goto("/");
      await sleep(r.int(300, 2000));
      await pg.goto(this.gamePath);
      return `home then game URL ${this.label(p)} (${phase})`;
    });
    add(2, phase !== "finished" && this.players.length < 9, async () => {
      const base = r.pick(this.players);
      const p = await this.join(base.name);
      return `same name, new identity: ${this.label(p)} (${phase})`;
    });
    add(2, phase !== "finished" && this.players.length < 9, async () => {
      const p = await this.join(this.freshName());
      return `late join ${this.label(p)} (${phase})`;
    });
    add(2, live.length > 0, async () => {
      const p = r.pick(live);
      await openPage(p, this.gamePath, this.rec);
      return `second tab ${this.label(p)} (${phase}, now ${p.pages.length} tabs)`;
    });
    add(4, withPages.length > 0, async () => {
      const p = r.pick(answering.length > 0 && r.chance(0.6) ? answering : withPages);
      const secs = r.int(2, 6);
      await goOffline(p);
      let extra = "";
      if (phase === "question" && p.pages[0]) {
        extra = ` answered offline: ${await this.answerOn(p.pages[0], "normal").catch((e) => `err ${String(e).slice(0, 60)}`)}`;
        if (r.chance(0.5)) {
          await sleep(300);
          extra += `, again: ${await this.answerOn(p.pages[0], "normal").catch((e) => `err ${String(e).slice(0, 60)}`)}`;
        }
      }
      await sleep(secs * 1000);
      const back = await goOnline(p);
      if (!back) this.violate(`${this.label(p)}: no game socket 35 s after the network came back`);
      return `network drop ${secs}s ${this.label(p)} (${phase})${extra}`;
    });
    add(2, true, async () => {
      const d = r.pick([this.host, this.tv]);
      const secs = r.int(2, 6);
      await goOffline(d);
      await sleep(secs * 1000);
      if (!(await goOnline(d))) this.violate(`${d.label}: no game socket 35 s after the network came back`);
      return `network drop ${secs}s ${d.label} (${phase})`;
    });
    add(6, answering.length > 0, async () => {
      const p = r.pick(answering);
      const style = r.pick(["normal", "normal", "long", "triple", "empty"] as const);
      return `answer ${this.label(p)}: ${await this.answerOn(p.pages[0], style)}`;
    });
    add(2, answering.length > 0, async () => {
      const p = r.pick(answering);
      const second = p.pages[1] ?? (await openPage(p, this.gamePath, this.rec));
      await second.getByRole("group", { name: /Number pad|Choices/ }).first().waitFor({ timeout: 10_000 }).catch(() => {});
      const pad1 = p.pages[0].getByRole("group", { name: "Number pad" });
      const pad2 = second.getByRole("group", { name: "Number pad" });
      if ((await visible(pad1)) && (await visible(pad2))) {
        await pad1.getByRole("button", { name: "4", exact: true }).click();
        await pad2.getByRole("button", { name: "7", exact: true }).click();
        await Promise.all([
          pad1.getByRole("button", { name: "Submit answer" }).click({ timeout: 2_000 }).catch(() => {}),
          pad2.getByRole("button", { name: "Submit answer" }).click({ timeout: 2_000 }).catch(() => {}),
        ]);
        return `two-tab race answer ${this.label(p)} (4 and 7)`;
      }
      const c1 = p.pages[0].getByRole("group", { name: "Choices" }).getByRole("button");
      const c2 = second.getByRole("group", { name: "Choices" }).getByRole("button");
      await Promise.all([c1.first().click({ timeout: 2_000 }).catch(() => {}), c2.last().click({ timeout: 2_000 }).catch(() => {})]);
      return `two-tab race choice ${this.label(p)}`;
    });
    add(2, true, async () => {
      const hp = this.hostPage();
      if (hp) await hp.reload();
      else await openPage(this.host, this.gamePath, this.rec);
      return `host reload (${phase})`;
    });
    add(2, true, async () => {
      await Promise.all(this.host.pages.map((pg) => pg.close()));
      await sleep(r.int(500, 4000));
      await openPage(this.host, this.gamePath, this.rec);
      return `host closes tab and reopens (${phase})`;
    });
    add(2, (phase === "lobby" || phase === "prep") && s.public.players.length > 0, async () => {
      const target = r.pick(s.public.players);
      const hp = this.hostPage() ?? (await openPage(this.host, this.gamePath, this.rec));
      if (phase === "prep") await hp.getByText(/^Players \(\d+\)$/).click({ timeout: 5_000 });
      await hp.getByRole("button", { name: `Remove ${target.name}` }).first().click({ timeout: 5_000 });
      const removedBefore = this.seatedIds(s);
      await expect
        .poll(async () => (await this.snap()).public.players.length, { timeout: 8_000 })
        .toBe(removedBefore.size - 1)
        .catch(() => this.violate(`host: Remove ${target.name} did not remove anyone`));
      const after = this.seatedIds(await this.snap());
      for (const id of removedBefore)
        if (!after.has(id)) {
          this.expectedSeated.delete(id);
          this.lastScore.delete(id);
        }
      return `host removes ${target.name} (${phase})`;
    });
    add(
      // Pace: leave the lobby within ~8 actions, so most chaos lands mid-game.
      phase === "question" ? 0 : phase === "lobby" ? 2 + this.index : 4,
      phase === "lobby" ? s.public.players.length > 0 : phase === "prep",
      async () => this.hostAdvance(s),
    );
    add(2, phase === "question", async () => {
      const hp = this.hostPage() ?? (await openPage(this.host, this.gamePath, this.rec));
      await hp.getByRole("button", { name: "Skip question" }).click({ timeout: 8_000 });
      return "host skips the question";
    });
    add(this.index > 20 ? 1 : 0, phase === "question" || phase === "prep", async () => {
      const hp = this.hostPage() ?? (await openPage(this.host, this.gamePath, this.rec));
      await hp.getByRole("button", { name: /^End game$/ }).first().click({ timeout: 8_000 });
      const confirm = hp.getByRole("button", { name: "End game now" });
      if (await confirm.isVisible({ timeout: 1_000 }).catch(() => false)) await confirm.click();
      return `host ends the game early (${phase})`;
    });
    add(2, true, async () => {
      const tp = this.tvPage();
      if (tp) await tp.reload();
      else await openPage(this.tv, this.tvPath, this.rec);
      return `tv reload (${phase})`;
    });
    add(1, true, async () => {
      await Promise.all(this.tv.pages.map((pg) => pg.close()));
      await sleep(r.int(500, 5000));
      await openPage(this.tv, this.tvPath, this.rec);
      return `tv closes and reopens (${phase})`;
    });
    add(2, phase === "question", async () => {
      await sleep((ANSWER_SECONDS + 2) * 1000);
      return `wait out the timer (${phase})`;
    });
    add(1, phase === "prep" || phase === "lobby", async () => {
      const t = r.int(1000, 4000);
      await sleep(t);
      return `idle ${t}ms (${phase})`;
    });

    const total = options.reduce((sum, [w]) => sum + w, 0);
    let roll = r.next() * total;
    for (const [w, f] of options) {
      roll -= w;
      if (roll <= 0) return f();
    }
    return options[options.length - 1][1]();
  }

  async hostAdvance(s: ServerSnapshot) {
    const hp = this.hostPage() ?? (await openPage(this.host, this.gamePath, this.rec));
    const phase = phaseOf(s);
    if (phase === "lobby") {
      await hp.getByRole("button", { name: "Start Game" }).click({ timeout: 8_000 });
      return "host taps Start Game";
    }
    const next = hp.getByRole("button", { name: /^Start (First|Next) Question$/ });
    const end = hp.getByTestId("end-game-button");
    await expect(next.or(end)).toBeVisible({ timeout: 8_000 });
    if (await next.isVisible()) {
      const label = await next.textContent();
      await next.click();
      return `host taps ${label}`;
    }
    await end.click();
    return "host taps End Game (last question)";
  }

  // ---------- finale ----------

  async finish() {
    this.index = 999;
    this.currentAction = "finish";
    for (const d of [this.host, this.tv, ...this.players]) if (d.net.offline && !d.contextClosed) await goOnline(d);
    if (!this.hostPage()) await openPage(this.host, this.gamePath, this.rec);
    if (!this.tvPage()) await openPage(this.tv, this.tvPath, this.rec);
    for (let step = 0; step < 12; step++) {
      const s = await this.snap();
      const phase = phaseOf(s);
      this.note(`finish: server ${stateName(s)}, ${s.public.players.length} seated, q${s.public.questionNumber}`);
      if (phase === "finished") break;
      const hp = this.hostPage();
      try {
        if (phase === "lobby" && s.public.players.length === 0) await this.join(this.freshName());
        else if (phase === "question") await hp.getByRole("button", { name: "Skip question" }).click({ timeout: 8_000 });
        else this.note(`finish: ${await this.hostAdvance(s)}`);
      } catch (error) {
        this.violate(`finish: the host could not drive the game on from ${stateName(s)}: ${String(error).split("\n")[0]}`);
        await hp.reload().catch(() => {});
      }
      await expect.poll(async () => stateName(await this.snap()), { timeout: 10_000 }).not.toBe(stateName(s)).catch(() => {});
    }
    const s = await this.snap();
    if (phaseOf(s) !== "finished") {
      this.violate(`finish: game never reached finished (server ${stateName(s)})`);
      return;
    }
    const hp = this.hostPage();
    await expect(hp.getByRole("heading", { name: "Game Over!" }))
      .toBeVisible({ timeout: 10_000 })
      .catch(() => this.violate("finish: host has no Game Over!"));
    const tp = this.tvPage();
    await expect(tp.getByTestId("final-scores-heading"))
      .toBeVisible({ timeout: 20_000 })
      .catch(() => this.violate("finish: TV never showed the final standings"));
    // The TV finale shows a podium of 3 plus 4 more rows and "+N more" (finale.tsx), by design.
    const ranked = [...s.public.players].sort((a, b) => b.score - a.score);
    const cut = ranked[Math.min(7, ranked.length) - 1]?.score ?? 0;
    for (const p of s.public.players) {
      for (const [who, page] of [
        ["host", hp],
        ["tv", tp],
      ] as const) {
        const row = await page
          .getByTestId(`player-score-${p.id}`)
          .first()
          .textContent({ timeout: who === "tv" ? 1_500 : 5_000 })
          .catch(() => null);
        const mustShow = who === "host" || p.score > cut || (ranked.length <= 7);
        if (row === null) {
          if (mustShow) this.violate(`finish: ${who} final standings miss ${p.name}`);
        } else if (!new RegExp(`${p.name.replace(/[^A-Za-z0-9]/g, "")}\\s*${p.score}\\s*(pts|points?)?\\s*$`).test(row.trim()))
          this.violate(`finish: ${who} shows "${row}" for ${p.name}, server score ${p.score}`);
      }
    }
    const shownOnTv = await tp.getByTestId(/^player-score-/).count();
    if (shownOnTv > s.public.players.length) this.violate(`finish: TV standings have ${shownOnTv} rows for ${s.public.players.length} players`);
    const seated = this.seatedIds(s);
    for (const pl of this.players) {
      if (pl.contextClosed || !pl.id || !seated.has(pl.id)) continue;
      for (const page of pl.pages)
        await expect(page.getByRole("heading", { name: "Game Over!" }))
          .toBeVisible({ timeout: 10_000 })
          .catch(() => this.violate(`finish: phone ${this.label(pl)} never showed Game Over!`));
    }
    await this.settle(3_000);
  }

  async closeAll() {
    for (const d of [this.host, this.tv, ...this.players]) if (d) await closeDevice(d);
  }
}

test.describe("chaos: leaving, rejoining and network drops across host, TV and phones", () => {
  for (const seed of SEEDS) {
    test(`seed ${seed}`, async ({ browser, baseURL }, testInfo) => {
      test.setTimeout(BUDGET_MS + 120_000);
      const rng = mulberry32(seed);
      const chaos = new Chaos(browser, baseURL ?? "http://localhost:3101", seed, rng);
      const started = Date.now();
      try {
        await chaos.setup();
        await chaos.settle();
        const count = Number(process.env.CHAOS_ACTIONS ?? rng.int(25, 40));
        for (let i = 0; i < count && Date.now() - started < BUDGET_MS; i++) {
          chaos.index = i;
          chaos.currentAction = "?";
          try {
            const what = await chaos.act();
            chaos.currentAction = what;
            chaos.note(what);
          } catch (error) {
            chaos.currentAction = "action error";
            chaos.note(`action error (not a violation by itself): ${String(error).split("\n")[0].slice(0, 200)}`);
          }
          await chaos.settle();
        }
        await chaos.finish();
      } finally {
        await testInfo.attach("action-log", { body: chaos.log.join("\n"), contentType: "text/plain" });
        writeFileSync(testInfo.outputPath("action-log.txt"), chaos.log.join("\n"));
        await testInfo.attach("violations", { body: JSON.stringify(chaos.violations, null, 2), contentType: "application/json" });
        await chaos.closeAll();
      }
      expect(chaos.violations.map((v) => `#${v.at} [${v.action}] ${v.message}`)).toEqual([]);
    });
  }
});
