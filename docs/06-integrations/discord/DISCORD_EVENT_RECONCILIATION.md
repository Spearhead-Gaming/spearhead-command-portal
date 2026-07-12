# Discord Event Reconciliation

Gateway observations update discovered Discord Scheduled Event inventory and compare linked events to the last Portal-published desired state.

## Drift

Drift is recorded when Discord-side state diverges from Portal-owned state. Drift does not automatically overwrite Portal events.

## Deleted Events

If a linked Discord Scheduled Event is deleted or unavailable, the link is marked drifted and a drift record is created. Staff can reapply Portal state or archive the link in a future workflow.
