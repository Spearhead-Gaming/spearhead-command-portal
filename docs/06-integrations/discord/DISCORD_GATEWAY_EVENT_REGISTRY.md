# Discord Gateway Event Registry

Gateway handlers are registered in `src/server/discord/gateway/registry.ts`.

Each handler declares:

- `handlerId`
- `eventName`
- `owningDomain`
- `description`
- `requiredIntents`
- `retry`
- `priority`
- `version`
- optional `idempotencyScope`
- optional custom `getIdempotencyKey`

## Handler Groups

- Lifecycle: `READY`, `RESUMED`, guild availability and updates.
- Identity: member join, leave, and update events.
- Inventory: channel and role create/update/delete events.
- Operations context: scheduled event observations.
- Voice awareness: non-authoritative voice state observations.
- Attachment continuation: scoped image/file continuation for active interaction sessions.

## Safety Rules

- Handlers must call Portal services rather than writing feature workflow logic directly.
- Unmanaged guilds are skipped by policy.
- Missing intents disable or limit affected handlers.
- Handler failures create failed Gateway event records and degrade Gateway health without breaking Portal availability.
