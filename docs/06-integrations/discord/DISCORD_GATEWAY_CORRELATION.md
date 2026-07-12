# Discord Gateway Correlation

Gateway correlation exists to make production support safer.

## Correlation Values

- `correlationId`: random per normalized event.
- `eventId`: deterministic event identity assembled from dispatch context.
- `idempotencyKey`: hashed duplicate-prevention key.
- `sessionIdHash`: hashed Gateway session ID for diagnostics only.

## Admin Visibility

Admin diagnostics may show:

- event name
- handler ID
- guild ID
- status
- safe summary
- correlation ID
- occurred timestamp

Admin diagnostics must not show bot tokens, raw session IDs, raw interaction signatures, or full unredacted payloads.
