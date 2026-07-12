# Position Role Automation

## Purpose

Position role automation is the foundation for billet or staff-position Discord role management.

## Triggers

- `personnel.position_assigned`
- `personnel.position_removed`

## Rules

- Position mappings must use Discord role IDs.
- Role changes should default to preview or manual approval.
- Position role automation must not grant Portal permissions.
- Portal position assignment remains authoritative.

## Current Status

The automation engine supports the trigger family and schema needed for position automation. Production execution should be enabled only after mappings and conflict rules are reviewed.

