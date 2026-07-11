# Discord Gateway Runbook

## Health Check

```powershell
npm run discord:gateway:health
```

Also review Administration -> Discord -> Gateway health.

## Restart

1. Stop the Gateway process.
2. Confirm no duplicate worker is running.
3. Start `npm run dev:gateway`.
4. Confirm status returns to connected.

## Incident Checklist

- Check `DISCORD_GATEWAY_ENABLED`.
- Check `DISCORD_BOT_TOKEN` is present.
- Check Discord Developer Portal intent toggles.
- Check recent `DiscordGatewayEventLog` failures.
- Check reconnect count.
- Confirm the web app is still receiving slash command interactions.

## Escalation

Disable the worker if it is repeatedly failing and threatening operational
clarity. The portal remains usable in webhook-first mode.
