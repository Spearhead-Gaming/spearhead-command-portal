# Discord Gateway Deployment

## Process Model

Deploy the Gateway worker as a separate long-running process from the Next.js web
server.

```powershell
npm run dev:gateway
```

Production process managers should run the equivalent TypeScript/Node command
with the same environment as the web app, plus Gateway-specific variables.

## Required Environment

```text
DISCORD_GATEWAY_ENABLED=true
DISCORD_BOT_TOKEN=
DISCORD_APPLICATION_ID=
DISCORD_GATEWAY_INTENTS=Guilds,GuildMembers,GuildVoiceStates
DISCORD_GATEWAY_SHARD_COUNT=1
DISCORD_PRIMARY_GUILD_ID=
```

## Deployment Rules

- Keep the Gateway worker disabled until Discord credentials and intents are
  validated.
- Run only one worker per shard.
- Monitor reconnect count and last error summary.
- Do not enable `MessageContent` without a documented workflow.
- Keep webhook interaction routes deployed even when Gateway is enabled.

## Rollback

Set:

```text
DISCORD_GATEWAY_ENABLED=false
```

Then stop the worker process. Slash commands and Discord REST delivery continue
through the web app.
