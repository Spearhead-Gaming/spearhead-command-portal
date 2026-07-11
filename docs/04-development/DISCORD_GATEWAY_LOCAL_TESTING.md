# Discord Gateway Local Testing

## Prerequisites

- Discord application with a bot token.
- Bot invited to the development guild.
- `DISCORD_GATEWAY_ENABLED=true`.
- `DISCORD_GATEWAY_INTENTS=Guilds,GuildMembers,GuildVoiceStates`.
- Guild Members intent enabled in the Discord Developer Portal if testing member
  join/update/leave.

## Startup

Run the web app:

```powershell
npm run dev
```

Run the Gateway worker in a second terminal:

```powershell
npm run dev:gateway
```

Check Gateway diagnostics:

```powershell
npm run discord:gateway:health
```

## What Should Happen

- The worker connects to Discord Gateway v10.
- Administration -> Discord shows Gateway status and recent events.
- Member join/update/leave events write `DiscordGatewayEventLog` entries.
- Voice events are logged only for servers where voice awareness is enabled.

## Common Failures

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| Worker exits disabled | `DISCORD_GATEWAY_ENABLED=false` | Set it to `true` and restart |
| 401/invalid token | Bad `DISCORD_BOT_TOKEN` | Regenerate/copy the bot token |
| No member events | Missing `GuildMembers` intent or Developer Portal toggle | Enable both |
| Bot appears offline | Worker is not running | Start `npm run dev:gateway` |
| Health shows no guilds | Bot is not in guild or lacks access | Reinvite bot and verify guild ID |

Slash commands still require the interaction webhook and public tunnel. The
Gateway worker does not receive slash command payloads.
