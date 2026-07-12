# Discord Reconciliation

Reconciliation turns discovered Discord drift into explicit admin decisions.

## Reconciliation Items

The system creates reconciliation items for changes that can affect operations:

- New resources
- Missing resources
- Orphaned mappings
- Renames
- Moves
- Permission metadata changes

## Conflict Rules

- Portal-owned labels, meanings, mappings, and permissions win.
- Discord-owned resource existence and IDs are observed from Discord.
- Renames update display metadata but do not change portal meaning.
- Missing mapped resources remain invalid until an administrator remaps or disables the mapping.
- Name matches are warnings, never automatic merge criteria.

## Future Actions

The reconciliation center is prepared for:

- Accept metadata update
- Ignore change
- Disable affected mapping
- Remap to a discovered resource
- Mark resource intentionally unmanaged
- Request rediscovery

Until those actions are fully implemented, items remain visible for staff review and audit context.

