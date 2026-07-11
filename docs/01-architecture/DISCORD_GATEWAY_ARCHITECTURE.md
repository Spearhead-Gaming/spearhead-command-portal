# Discord Gateway Architecture

## Purpose

The Discord Gateway worker gives the portal a safe real-time event bridge for
Discord state changes. It complements the existing interaction webhook. It does
not replace slash command, button, or modal handling.

## Runtime Split

| Runtime | Command | Responsibility |
| --- | --- | --- |
| Web app | `npm run dev` / production Next.js server | Portal UI, Auth.js, API routes, Discord interaction webhook |
| Gateway worker | `npm run dev:gateway` | Discord Gateway identify, heartbeat, reconnect, event dispatch |
| CLI diagnostics | `npm run discord:health`, `npm run discord:gateway:health` | Safe config and runtime health checks |

## Principles

- Portal data remains the source of truth.
- Discord ID is the canonical external identity.
- Gateway events call portal services; they do not mutate models directly when a
  domain service exists.
- Bots are skipped by default.
- Discord roles never authorize portal access.
- Voice state is only a presence suggestion, not attendance.
- Message content is avoided unless a future documented workflow explicitly
  requires it.

## Components

| Component | Responsibility |
| --- | --- |
| `src/server/discord/gateway/client.ts` | WebSocket connection, identify payload, heartbeat, reconnect |
| `src/server/discord/gateway/registry.ts` | Event handler registry and intent mapping |
| `src/server/discord/gateway/dispatcher.ts` | Bounded retry dispatch and failure recording |
| `src/server/discord/gateway/state-store.ts` | Gateway state and event log persistence |
| `src/server/discord/gateway/member-events.ts` | Member join/update/leave handoff to identity sync |
| `src/server/discord/gateway/voice-state.ts` | Optional voice awareness sessions |
| `src/server/discord/gateway/attachment-continuation.ts` | Approved image attachment continuation for active sessions |
| `src/server/discord/gateway/health.ts` | Admin health summary |
| `src/server/discord/gateway/rules.ts` | Gateway health rule provider |
| `src/server/discord/gateway/recommendations.ts` | Operator recommendations from health failures |

## Data Flow

1. Worker starts only when `DISCORD_GATEWAY_ENABLED=true`.
2. Worker connects to Discord Gateway v10.
3. Worker identifies with configured intents.
4. Discord dispatches events.
5. Dispatcher routes events to registered handlers.
6. Handlers call portal services and record `DiscordGatewayEventLog`.
7. Health state updates in `DiscordGatewayState`.
8. Administration -> Discord shows status, events, rules, and recommendations.

## Failure Behavior

- Handler failures are retried with bounded backoff.
- Final handler failures are logged and do not crash the worker loop.
- Gateway reconnects use exponential backoff.
- Missing credentials fail safely without printing secrets.
- Discord failures must not overwrite portal source-of-truth records.

## Deferred

- Gateway-driven automatic role sync.
- Nickname sync execution.
- Moderation event ingestion.
- Message content ingestion.
- Production process supervisor configuration.
