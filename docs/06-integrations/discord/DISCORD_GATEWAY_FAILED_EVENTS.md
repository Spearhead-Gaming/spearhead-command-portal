# Discord Gateway Failed Events

Failed Gateway events are isolated operational diagnostics.

## Behavior

- Final handler failures are recorded with safe summaries.
- Gateway health becomes degraded.
- Portal pages, slash commands, and REST delivery should continue working.
- Failed events remain available for staff review until retention cleanup.

## Retry Policy

The current implementation records retryable failures and exposes them in diagnostics. Manual retry and resolve workflows are permission-scaffolded for future admin tooling.

## Permissions

- `discord.gateway.events.retry`
- `discord.gateway.events.resolve`
- `discord.gateway.diagnostics.view`
- `discord.gateway.metrics.view`
