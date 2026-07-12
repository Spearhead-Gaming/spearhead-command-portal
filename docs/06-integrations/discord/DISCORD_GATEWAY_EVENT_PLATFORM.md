# Discord Gateway Event Platform

The Discord Gateway worker is an optional real-time observation layer for the Portal. It supplements REST delivery, slash command webhooks, and scheduled reconciliation; it does not replace them.

## Responsibilities

- Observe managed guild lifecycle, member, role, channel, scheduled event, voice, and attachment-continuation events.
- Observe moderation-relevant state such as member removal, ban/unban drift, and timeout state where Gateway events provide enough context.
- Normalize every dispatch into a safe Gateway event envelope.
- Route events through registered handlers with ownership, required intents, versioning, retry policy, and idempotency.
- Preserve Portal authority. Discord events may update Discord-owned identity or inventory fields, but they must not grant Portal permissions or overwrite operational records.
- Isolate failed events from the web app, slash commands, and REST notification delivery.

## Non-Goals

- No broad message monitoring.
- No audio capture or voice recording.
- No attendance inference from voice presence.
- No Discord event creation or management.
- No moderation execution.
- No authorization from Discord roles.

## Runtime

Run the worker separately from Next.js:

```powershell
npm run dev:gateway
```

Diagnostics:

```powershell
npm run gateway:preflight
npm run gateway:health
npm run gateway:diagnostics
npm run gateway:events:list
```

## Source of Truth

The Portal remains authoritative. Gateway events may create observations, diagnostics, reconciliation items, notification delivery state, or Discord-owned identity updates. Operational decisions still flow through Portal services.

## Scheduled Events

Gateway observes Discord Scheduled Event create/update/delete and participation signals. Outbound creation, update, and cancellation use Discord REST through the Portal event-management service.

## Moderation Observations

Gateway can create moderation observations for Discord-side state changes. These observations support reconciliation and history, but they do not replace case-backed Portal moderation actions.

REST remains the execution path for timeout, kick, ban, and unban. Gateway records what Discord reports afterward.
