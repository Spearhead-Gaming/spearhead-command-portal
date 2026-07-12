# Discord Sync Scheduling

Discord sync scheduling records future policy for periodic inventory refreshes.

## Schedule Model

`DiscordSyncSchedule` supports:

- Manual or scheduled policy labels
- Full sync cron placeholder
- Targeted sync cron placeholder
- Gateway-driven flag
- Enabled flag
- Last run, next run, status, and error fields

## Current Scope

Phase 4 Epic 3 records and displays scheduling policy but does not implement a production scheduler. Admins can still manually run full, targeted, or dry-run discovery.

## Future Integration

Future scheduler work should call the discovery service layer and preserve rate-limit behavior, audit logs, and reconciliation records.

