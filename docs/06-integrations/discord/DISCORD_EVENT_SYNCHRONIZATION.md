# Discord Event Synchronization

Synchronization sends Portal-owned changes to linked Discord Scheduled Events through Discord REST.

## Fields

- title
- description
- start time
- end time
- entity type where safe
- channel or external location
- cancellation state

## Behavior

- Updates are idempotent by plan and source version.
- Multi-guild results are independent.
- Partial success is preserved.
- Communication delivery remains separate through the Communication Platform.
