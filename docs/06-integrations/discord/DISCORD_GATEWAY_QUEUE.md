# Discord Gateway Queue

Gateway event handling uses a lightweight database-backed queue log through `DiscordGatewayEventLog`.

## Statuses

- `queued`
- `processing`
- `processed`
- `skipped`
- `failed`
- `no_change`
- `degraded`

## Flow

1. The Gateway client receives a dispatch.
2. The dispatch is normalized into an event envelope.
3. The dispatcher applies policy and idempotency checks.
4. A queued event record is created.
5. The handler runs with retry policy.
6. Success marks the event processed.
7. Final failure records a failed event and degrades Gateway health.

Failed queue items are visible in the Discord Operations Center and via:

```powershell
npm run gateway:events:list
```
