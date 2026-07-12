# Discord Platform Architecture

## Principle

The Portal remains the authoritative source of truth. Discord guilds are managed resources that reflect portal state and collect quick interaction input.

## Platform Shape

The Discord platform supports:

- one primary community guild
- optional unit guilds
- optional staff, training, development, testing, and future guilds
- explicit channel mappings
- explicit role mappings
- guild inventory snapshots
- per-guild health and diagnostics

Interaction webhooks remain global. Guild-specific behavior is resolved after the interaction is validated and linked to a portal user/member.

## Source Of Truth

Portal owns:

- members
- permissions
- applications
- qualifications
- operations
- events
- communications

Discord supplies:

- guild/channel/role inventory
- user identity signals
- interaction inputs
- notification destinations

## No Hardcoded Guild Logic

Guild type influences defaults only. It never grants permissions and must never be used as authorization logic.

## Existing Migration Path

The existing `DiscordServer` record is now the managed guild record. Existing channel mappings, role mappings, member state, sync logs, delivery records, and moderation records remain attached to that record.

Primary community guild bootstrap marks the configured guild as `isPrimary=true` and creates default module configuration without overwriting administrator mappings.

## Phase 4 Resource Discovery Layer

Resource discovery observes Discord-owned resources while preserving portal-owned mappings and workflow meaning.

Discovery records sessions, snapshots, resource changes, reconciliation items, scheduled event inventory, emoji inventory, sticker inventory, and future permission/capability snapshots.

Related docs:

- `DISCORD_RESOURCE_DISCOVERY.md`
- `DISCORD_RESOURCE_OWNERSHIP_RULES.md`
- `DISCORD_RECONCILIATION.md`
- `DISCORD_SYNCHRONIZATION.md`
# Discord Event Management

Portal-managed Discord Scheduled Events use the event-management layer documented in `DISCORD_EVENT_MANAGEMENT.md`. Gateway observes external changes, while Discord REST performs create, update, and cancellation actions. Discord Scheduled Events never become the source of truth for Portal event workflows.

# Discord Application Entry Points

Application entry points are documented in `DISCORD_APPLICATION_INTEGRATION.md`. Discord may expose `/apply` commands, application panels, secure continuation links, and review messages, but the Portal owns application records, applicant answers, eligibility, review decisions, personnel changes, and audit history.
