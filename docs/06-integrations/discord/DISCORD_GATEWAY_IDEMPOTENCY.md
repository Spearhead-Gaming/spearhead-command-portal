# Discord Gateway Idempotency

Gateway delivery can repeat after reconnects, resumes, retries, or duplicate worker execution. Handlers must be idempotent.

## Idempotency Sources

- Event envelope `idempotencyKey`
- Handler-specific `getIdempotencyKey`
- Handler ID
- Guild ID
- Discord resource ID
- Discord user ID
- Gateway sequence where available

## Terminal Statuses

The dispatcher treats these statuses as already handled:

- `queued`
- `processing`
- `processed`
- `skipped`
- `no_change`
- `completed`

This prevents duplicate side effects while a same-key event is already in-flight or already complete.

## Rule

Never use display names, role names, channel names, or unit names as idempotency keys.
