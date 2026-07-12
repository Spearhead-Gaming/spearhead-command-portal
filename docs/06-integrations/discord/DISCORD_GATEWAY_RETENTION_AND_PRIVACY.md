# Discord Gateway Retention And Privacy

Gateway logs are operational diagnostics, not permanent audit history.

## Retention

`src/server/discord/gateway/retention.ts` provides cleanup for old processed/skipped events. Failed events should be retained long enough for staff review.

## Privacy Standards

- Store safe summaries instead of raw payload dumps.
- Hash Gateway session identifiers.
- Never log secrets.
- Avoid exposing message content.
- Treat voice awareness as sensitive operational context.

## Audit Logs

Audit logs remain the historical record for meaningful actions. Gateway event logs are runtime diagnostics and should not replace audit history.
