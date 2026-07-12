# Qualification Role Automation

## Purpose

Qualification role automation keeps explicitly mapped Discord qualification roles aligned with Portal qualification records.

## Triggers

- `qualification.awarded`: add mapped role.
- `qualification.renewed`: add or verify mapped role.
- `qualification.revoked`: remove mapped role.
- `qualification.expired`: remove mapped role.
- `qualification.reinstated`: add mapped role when supported.

## Source Of Truth

Member qualification records in the Portal are authoritative. Discord roles are a display and communication convenience only.

## Current Implementation

`src/server/qualifications/service.ts` emits best-effort automation planning for award and revoke actions. The automation engine plans against active `DiscordRoleMapping` records with mapping type `qualification`.

If Discord automation planning fails, the qualification change still completes and the failure is recorded through automation diagnostics where available.

