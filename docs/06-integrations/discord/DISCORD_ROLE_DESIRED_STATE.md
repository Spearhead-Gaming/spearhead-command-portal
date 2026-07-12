# Discord Role Desired State

## Purpose

`DiscordManagedRoleAssignment` records what the Portal believes should be true for a member and a portal-managed Discord role.

Desired state supports:

- idempotent role execution.
- drift detection.
- reconciliation.
- manual sync preview.
- audit-friendly history.

## States

Expected state is either:

- `present`
- `absent`

Only one current desired-state row should represent the current automation outcome for the same member, guild, role, and source.

## Member Visibility

Desired-state records are operational automation data. Members do not need to see historical role versions by default. Staff/admin diagnostics may show current and historical state.

