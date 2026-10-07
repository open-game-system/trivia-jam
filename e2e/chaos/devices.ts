import { expect, type Browser, type BrowserContext, type Page, type WebSocketRoute } from "@playwright/test";

/**
 * Chaos devices: a browser context per phone/TV/host with a switchable network. Playwright's
 * context.setOffline() does not close an open WebSocket in Chromium (it only blocks new requests),
 * so every context routes its actor-kit sockets through Playwright: "offline" closes them like a
 * dropped network and fails reconnect attempts until the network is back.
 */
export type Net = { offline: boolean; sockets: Set<WebSocketRoute> };

export type Device = {
  label: string;
  context: BrowserContext;
  pages: Page[];
  net: Net;
  contextClosed: boolean;
};

export type Recorder = {
  note: (line: string) => void;
  pageProblem: (device: string, kind: string, text: string) => void;
};

/** Console errors expected when we cut a device's network on purpose. */
const BENIGN_CONSOLE = [
  /\[ActorKitClient\] WebSocket error/,
  /ERR_INTERNET_DISCONNECTED/,
  /Failed to load resource/,
  /WebSocket connection to .* failed/,
  /net::ERR_/,
];

export async function newDevice(browser: Browser, label: string): Promise<Device> {
  const context = await browser.newContext();
  const net: Net = { offline: false, sockets: new Set() };
  await context.routeWebSocket(/\/api\/(game|session)\//, async (ws) => {
    // A connection attempt made while offline fails at once (close without open), like a phone
    // with no signal: actor-kit counts it against its retry budget and keeps queued events queued.
    if (net.offline) {
      await ws.close({ code: 1011, reason: "chaos: no network" }).catch(() => {});
      return;
    }
    const server = ws.connectToServer();
    if (/\/api\/game\//.test(ws.url())) net.sockets.add(ws);
    ws.onClose(() => {
      net.sockets.delete(ws);
      void server.close().catch(() => {});
    });
    server.onClose(() => {
      net.sockets.delete(ws);
      void ws.close().catch(() => {});
    });
  });
  return { label, context, pages: [], net, contextClosed: false };
}

export function watchPage(page: Page, device: Device, rec: Recorder) {
  page.on("pageerror", (error) => rec.pageProblem(device.label, "pageerror", error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (BENIGN_CONSOLE.some((re) => re.test(text))) return;
    rec.pageProblem(device.label, "console.error", text.slice(0, 300));
  });
  page.on("close", () => {
    device.pages = device.pages.filter((p) => p !== page);
  });
}

export async function openPage(device: Device, path: string, rec: Recorder): Promise<Page> {
  const page = await device.context.newPage();
  watchPage(page, device, rec);
  device.pages.push(page);
  await page.goto(path);
  return page;
}

export async function goOffline(device: Device) {
  device.net.offline = true;
  await device.context.setOffline(true);
  await Promise.all([...device.net.sockets].map((s) => s.close({ code: 4001, reason: "chaos: network lost" }).catch(() => {})));
}

/** Back online; waits until each open page has its game socket again (actor-kit backs off 2, 4, 8 s). */
export async function goOnline(device: Device) {
  device.net.offline = false;
  await device.context.setOffline(false);
  if (device.pages.length === 0) return true;
  try {
    await expect.poll(() => device.net.sockets.size, { timeout: 35_000 }).toBeGreaterThanOrEqual(device.pages.length);
    return true;
  } catch {
    return false;
  }
}

export async function closeDevice(device: Device) {
  if (device.contextClosed) return;
  device.contextClosed = true;
  device.pages = [];
  await device.context.close().catch(() => {});
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Tiny seeded PRNG (mulberry32): a failing seed replays the same actions. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T,>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
  };
}
export type Rng = ReturnType<typeof mulberry32>;
