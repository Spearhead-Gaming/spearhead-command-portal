# Member Status Role Automation

## Purpose

Member status role automation prepares for Discord role changes when Portal member status changes.

Examples:

- active member role.
- LOA role.
- inactive role.
- applicant or recruit role.

## Triggers

- `personnel.status_changed`
- `discord.member_joined`
- `discord.member_left`
- `discord.manual_sync`

## Rules

- Status in the Portal is authoritative.
- Discord join/leave state may inform diagnostics but must not delete Portal profiles.
- Bots remain excluded by default.
- Role changes should default to preview or manual approval.

## Current Status

The schema and trigger constants are present. Production mappings and execution should be introduced incrementally after qualification and unit automation are proven safe.

