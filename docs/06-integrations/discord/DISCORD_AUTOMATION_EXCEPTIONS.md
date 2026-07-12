# Discord Automation Exceptions

## Purpose

Exceptions allow staff to suppress or pause automation for a scoped member, role, guild, definition, or source event.

## Example Uses

- Temporarily stop qualification role automation for a member under review.
- Prevent a deleted Discord role from repeatedly generating failed actions.
- Pause unit role changes during a Discord reorganization.

## Rules

- Exceptions are time-bound where possible.
- Exceptions should be visible in admin diagnostics.
- Active exceptions block execution and recommend staff review.
- Exceptions do not delete history or desired-state records.

