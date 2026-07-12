# Unit Role Automation

## Purpose

Unit role automation keeps explicitly mapped Discord unit roles aligned with Portal unit assignments.

## Triggers

- `personnel.unit_assigned`: add mapped unit role.
- `personnel.unit_removed`: remove mapped unit role.

## Rules

- Do not infer unit roles by unit name.
- Use `DiscordRoleMapping` and discovered role IDs.
- Unit assignment in the Portal remains authoritative.
- Role automation must not change roster assignment history.

## Current Status

Definitions can be generated from existing unit role mappings in preview/manual mode. Full roster-service trigger integration should use the same engine entry point as qualification automation.

