import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { z } from "zod";

/**
 * OGS seam helpers (test only): a fixed ES256 key that signs game tokens shaped like the OGS API's,
 * the local key set the server verifies them against (run the server with
 * `--var OGS_JWKS_URL:http://localhost:8833/.well-known/jwks.json`), and the fake OGS app WebView.
 */

export const OGS_JWKS_PORT = Number(process.env.OGS_JWKS_PORT ?? 8833);

// A fixed key: the server's verifier caches the key set, so the same key must sign on every run.
const Fixture = z.object({
  kid: z.string(),
  privateJwk: z.object({ kty: z.string(), crv: z.string(), x: z.string(), y: z.string(), d: z.string() }),
});
const fixture = Fixture.parse(JSON.parse(readFileSync(new URL("../fixtures/ogs-test-key.json", import.meta.url), "utf8")));

const b64url = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const b64urlJson = (v: unknown) => b64url(new TextEncoder().encode(JSON.stringify(v)));
const ec = { name: "ECDSA", namedCurve: "P-256" };

export const ogsJwks = () => {
  const { d: _d, ...pub } = fixture.privateJwk;
  return { keys: [{ ...pub, kid: fixture.kid, alg: "ES256", use: "sig" }] };
};

/** Signs `claims` as an OGS game token with the fixture key. */
export async function signOgsToken(claims: unknown): Promise<string> {
  const key = await crypto.subtle.importKey("jwk", fixture.privateJwk, ec, false, ["sign"]);
  const input = `${b64urlJson({ alg: "ES256", kid: fixture.kid, typ: "JWT" })}.${b64urlJson(claims)}`;
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(input));
  return `${input}.${b64url(new Uint8Array(sig))}`;
}

export type OgsPerson = { id: string; handle: string; name: string };

/** Claims of a game token for `aud`, valid for an hour from now. */
export function gameClaims(aud: string, who: OgsPerson) {
  const iat = Math.floor(Date.now() / 1000);
  return {
    iss: "https://api.opengame.org",
    aud,
    sub: who.id,
    handle: who.handle,
    name: who.name,
    avatar: `https://tv.opengame.org/art/trivia-jam/char-${who.handle}.webp`,
    iat,
    exp: iat + 3600,
  };
}

/** Serves the fixture's key set on OGS_JWKS_PORT; resolves to a closer. */
export function serveOgsJwks(): Promise<() => Promise<void>> {
  const server: Server = createServer((req, res) => {
    if (req.url !== "/.well-known/jwks.json") return void res.writeHead(404).end();
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(ogsJwks()));
  });
  // The key set is a fixed fixture: when another Playwright run already serves it, share that one.
  return new Promise((resolve, reject) => {
    server.once("error", (e: NodeJS.ErrnoException) =>
      e.code === "EADDRINUSE" ? resolve(() => Promise.resolve()) : reject(e),
    );
    server.listen(OGS_JWKS_PORT, () =>
      resolve(
        () =>
          new Promise<void>((done) => {
            server.close(() => done());
            server.closeAllConnections();
          }),
      ),
    );
  });
}

/**
 * The OGS app's WebView as the page sees it: window.ReactNativeWebView answers BRIDGE_READY with
 * STATE_INIT for each store (`profile` holds the OGS profile and its game token). Every message the
 * page sends to the app is kept in window.__ogsSent.
 */
export const fakeOgsWebView = (stores: Record<string, unknown>) => `
  window.__ogsSent = [];
  const stores = ${JSON.stringify(stores)};
  window.ReactNativeWebView = {
    postMessage(raw) {
      const msg = JSON.parse(raw);
      window.__ogsSent.push(msg);
      if (msg.type === "BRIDGE_READY") {
        setTimeout(() => {
          for (const [storeKey, data] of Object.entries(stores))
            window.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type: "STATE_INIT", storeKey, data }) }));
        }, 50);
      }
    },
  };
`;
