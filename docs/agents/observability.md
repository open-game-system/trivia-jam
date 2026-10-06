# Observability

How Trivia Jam logs, what the client reports, and how /sre-agent watches it.

## Workers

| Worker | Name (wrangler) | Observability on |
|--------|-----------------|------------------|
| The whole app (TanStack Start via Nitro + Durable Objects `Session`, `Game`) | `trivia-jam` | yes (`head_sampling_rate = 1`, `CF_VERSION_METADATA` gives `version`) |

## Server wide events

One wide event per HTTP request handled by `server/middleware/actor-kit.ts` and per room action
(each WebSocket message) in the `Game` Durable Object (`src/game.server.ts`), emitted with
`console.log(obj)` (`console.error(obj)` on failure, with `error.{type,message,stack}`). The emit
function is `withWideEvent` in [src/wide-event.ts](../../src/wide-event.ts): it drops context keys that
could carry names, tokens or typed text. Shape and rules: /wide-events-logging.

Note: `wrangler dev` (as run by `pnpm dev`, `--inspector-port 0`) does not print Worker console
output locally; the lines show in Workers Logs in production and are covered by unit tests.

## Client telemetry

Errors and session lifecycle are buffered on the device ([src/telemetry.ts](../../src/telemetry.ts), wired
in [src/client-telemetry.ts](../../src/client-telemetry.ts) from the root route) and posted to
`POST /events` (same-origin, body-limited), which re-emits each as `event: "client.<type>"`,
`source: "client"` ([src/events-route.ts](../../src/events-route.ts)). The root route's `errorComponent`
reports render errors. Telemetry is off under automation (`navigator.webdriver`, `?record`, `?test`).
Approach: /client-telemetry. Seam test: [src/telemetry.seam.test.ts](../../src/telemetry.seam.test.ts).

## Event names

| Event | Source | Level | Fields | Meaning |
|-------|--------|-------|--------|---------|
| http.request | server | info/error | method, path (ids → `:id`), route (health/events/actor-kit/page), status, duration_ms | One request through the middleware |
| room.action | server | info/error | room_id, action (the event type, e.g. SUBMIT_ANSWER), duration_ms | One WebSocket message handled by a game room |
| client.error | client | error | error.type, error.message, screen (tv/phone), boundary | An uncaught error, unhandled rejection or render error on a device |
| client.session_start / client.session_end | client | info | session_id, screen | A page session began / ended (a missing end becomes `PreviousSessionCrashed`) |

## sre-agent

- Status: autonomy 0 (observe: job summary only)
- Config: [.github/sre-agent.yml](../../.github/sre-agent.yml)
- `errorFields` mapping: none (lines use the recommended shape)
- Notification: sre-agent emails Jon through the shared `sre-notify` Worker.

## Privacy

Kids use this game. Never log display names, profile names, emails, tokens or anything a player
typed (question text, answers, pasted documents). Ids, counts, flags and enum values only.
