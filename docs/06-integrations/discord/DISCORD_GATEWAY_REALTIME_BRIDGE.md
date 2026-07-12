# Discord Gateway Real-Time Bridge

The real-time bridge maps Discord observations into Portal-owned services.

## Event Domains

- Identity events update Discord-owned member identity fields.
- Guild, role, and channel events update discovery inventory and reconciliation items.
- Scheduled event observations create external-context records only.
- Voice events update presence suggestions only.
- Attachment events continue active Portal interaction sessions only.

## Multi-Guild Policy

Each event is evaluated against managed guild policy. Unknown or unmanaged guilds are skipped unless the event is a global lifecycle event.

## Portal Authority

Discord state may suggest reconciliation, but Portal administrators must approve mappings, permissions, publishing actions, and operational workflow changes.
