# Discord Synchronization

Discord synchronization keeps Portal inventory aware of Discord resource changes without letting Discord own portal decisions.

## Principles

- Portal state is authoritative for workflows, permissions, mappings, and automation policy.
- Discord resource existence and metadata are read from Discord.
- Discovery writes inventory snapshots and drift records.
- Reconciliation converts drift into safe administrator decisions.
- Discord API failures must not corrupt portal-owned data.

## Synchronization Types

- Full: refreshes all supported resource types.
- Incremental: future Gateway-driven or scheduled small refreshes.
- Targeted: refreshes selected resource types.
- Dry run: records what would change without mutating inventory.

## Rate Limits

Discord REST requests use a shared helper that retries short 429 responses and records rate-limit metadata on discovery sessions. Longer failures become warnings or failed sessions and should be reviewed in the Operations Center.

## Scheduling

`DiscordSyncSchedule` stores future schedule policy. Current UI exposes schedule state as diagnostics; automation execution remains a future operational task.

