# Discord Role and Nickname Sync

## Current State

Role sync is manual and mapping-based. Nickname sync is configuration-only and
disabled by default.

## Role Sync Rules

- Only roles explicitly mapped in the portal may be changed.
- Preview mode should be reviewed before running sync.
- Discord failures must not alter portal records.
- Bot role hierarchy errors are runtime Discord configuration issues.
- Gateway role events currently produce diagnostics only.

## Nickname Sync Rules

- Nickname sync must remain disabled unless explicitly enabled later.
- Discord display name remains the visible member-name source where available.
- Portal-owned service record data must not depend on nickname sync.

## Deferred

- Automatic role sync from Gateway member events.
- Automatic role sync from qualification changes.
- Nickname sync execution.
