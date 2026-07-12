# Phase 4 Discord Mapping Integrity Report

## Mapping Rules

- Mappings use Discord resource IDs, not names.
- Renames preserve mappings.
- Deleted or missing resources require reconciliation.
- The Portal must never guess channels or roles by display name.
- Unit guild membership does not create Unit assignment.

## Integrity Checks

| Check | Expected Result |
| --- | --- |
| Active channel mappings reference active guilds | Pass |
| Active role mappings reference active guilds | Pass |
| Discovery can identify renamed resources by ID | Pass after discovery |
| Missing resources appear in reconciliation | Pass after discovery |
| Duplicate guild IDs prevented | Enforced by schema |
| Duplicate mapping key per guild prevented | Enforced by schema |
| Duplicate mapped channel per guild prevented | Enforced by schema |

## Operational Follow-Up

Run discovery after major Discord changes and before certifying guilds for communications, events, applications, or automation.
