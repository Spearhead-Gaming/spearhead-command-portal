# Discord Gateway Deployment

Resource discovery does not require the Gateway worker. Manual full, targeted, and dry-run discovery uses Discord REST from the web app.

Future Gateway-driven resource updates should enqueue targeted discovery through `src/server/discord/discovery.ts` rather than writing inventory directly.

## Process Model

Deploy the Gateway worker as a separate long-running process from the Next.js web
server.

```powershell
npm run dev:gateway
```

Production process managers should run the equivalent TypeScript/Node command
with the same environment as the web app, plus Gateway-specific variables.

Additional diagnostics:

```powershell
npm run gateway:preflight
npm run gateway:health
npm run gateway:diagnostics
npm run gateway:events:list
```

## Required Environment

```text
DISCORD_GATEWAY_ENABLED=true
DISCORD_BOT_TOKEN=
DISCORD_APPLICATION_ID=
DISCORD_GATEWAY_INTENTS=Guilds,GuildMembers,GuildVoiceStates,GuildScheduledEvents
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
- Treat the Gateway worker as an observer. REST publishing and webhook
  interactions remain the primary command and delivery paths.
- Review failed events and stale queue counts before assuming a Discord outage.

## Plesk Deployment Notes

Run the Gateway as a separate Node process or scheduled service, not as part of
the Next.js request process. Only one worker should run per shard. If the worker
is stopped, slash commands and REST posting can still work, but real-time member,
resource, voice, and attachment-continuation observations will pause.

## Rollback

Set:

```text
DISCORD_GATEWAY_ENABLED=false
```

Then stop the worker process. Slash commands and Discord REST delivery continue
through the web app.
