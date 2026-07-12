# Discord Gateway Deployment

This page mirrors the development deployment notes for the Discord Gateway worker.

For the canonical development runbook, see `docs/04-development/DISCORD_GATEWAY_DEPLOYMENT.md`.

## Production Shape

- Run the Next.js app and Gateway worker as separate processes.
- Use one Gateway worker per shard.
- Keep webhook interaction routes deployed even when Gateway is enabled.
- Apply Prisma schema changes before starting the worker.
- Monitor Gateway health, failed events, stale queue count, and reconnect count.

## Plesk Notes

Use a separate Node process for the Gateway worker. Do not rely on the web process lifecycle to keep the worker online.

Recommended checks after deployment:

```powershell
npm run gateway:preflight
npm run gateway:health
```
