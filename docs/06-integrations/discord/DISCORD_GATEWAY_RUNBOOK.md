# Discord Gateway Runbook

## Local Startup

```powershell
npm run dev
npm run dev:gateway
npm run gateway:preflight
```

## Health Check

```powershell
npm run gateway:health
npm run gateway:diagnostics
```

## Failed Events

```powershell
npm run gateway:events:list
```

Review failed events in Administration > Discord Operations Center.

## Common Issues

- Missing `DISCORD_BOT_TOKEN`: worker cannot authenticate.
- Missing privileged `GuildMembers` intent: member sync events will not arrive.
- Missing `GuildVoiceStates` intent: voice awareness remains unavailable.
- Worker stopped: bot may appear offline even though webhooks and REST commands still work.
- Duplicate process: idempotency protects side effects, but deploy only one worker per shard.

## Rollback

Set:

```text
DISCORD_GATEWAY_ENABLED=false
```

Stop the Gateway worker. Webhook interactions and REST delivery continue through the web app.
