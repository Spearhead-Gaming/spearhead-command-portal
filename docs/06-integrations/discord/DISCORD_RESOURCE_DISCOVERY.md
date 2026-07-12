# Discord Resource Discovery

Discord resource discovery is the safe inventory layer for managed guilds.

The Portal owns configuration, mappings, permissions, workflows, and business decisions. Discord owns native resource existence and metadata such as channel names, role names, scheduled event metadata, emoji, stickers, and permission overwrites.

## Resource Types

Discovery currently supports:

- Guild metadata
- Channels, categories, threads, forums, voice, stage, and announcement channels
- Roles
- Scheduled events
- Emoji
- Stickers
- Permission/capability metadata placeholders

## Scan Modes

- Full discovery refreshes all supported resource types for a guild.
- Targeted discovery refreshes selected resource types.
- Dry run discovery creates snapshots, diffs, and reconciliation items without mutating stored inventory.
- Repair scan is reserved for targeted future drift repair workflows.
- Gateway-driven updates may later trigger incremental targeted discovery.

## Identity Rules

Discord IDs are canonical for Discord-native resources. Names are display metadata only.

Discovery must never auto-remap by name. If a channel or role is deleted and recreated with the same name, it is a different Discord resource and requires explicit administrator review.

## Admin Workflow

Administrators use `/administration/discord` to:

- Run full, targeted, or dry-run discovery.
- Inspect resource directories in the guild inspector.
- Review reconciliation items.
- Confirm or repair mappings explicitly.

