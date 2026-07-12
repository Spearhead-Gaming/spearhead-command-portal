# Discord Automation Conflicts

## Purpose

Conflicts capture cases where two or more definitions may request incompatible role outcomes.

Examples:

- one definition adds a role while another removes the same role for the same member.
- a member status rule removes an active unit role while a unit assignment rule adds it.
- a staff override conflicts with automated qualification state.

## Required Behavior

Conflicts must not be resolved silently. The engine should block, require approval, or create a reconciliation item depending on severity.

## Future Work

The current schema supports conflict records. Future work should add richer conflict detection during planning and surface conflicts in the Operations Center.

