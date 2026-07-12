# Discord Local Testing

## Current Runtime Mode

The current portal implementation is Discord interaction webhook-first.

Implemented:

- Slash command catalog.
- Discord REST command registration scripts.
- `POST /api/discord/interactions`.
- Signature validation with `DISCORD_PUBLIC_KEY`.
- Slash command, button, and modal routing.
- Discord message delivery through REST when portal workflows post messages.

Optional real-time layer:

- `npm run dev:gateway` starts the Discord Gateway worker when `DISCORD_GATEWAY_ENABLED=true`.
- The Gateway worker consumes guild/member/voice/message events for portal services.
- Slash commands, buttons, and modals still use the interaction webhook and do not move to the Gateway worker.

If the Gateway worker is not running, the bot may appear offline while slash commands still work. Slash commands are delivered to the interaction webhook configured in the Discord Developer Portal.

## Required Environment

```text
AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_PUBLIC_KEY=
DISCORD_APPLICATION_ID=
DISCORD_REGISTER_MODE=guild
DISCORD_DEV_GUILD_ID=
DISCORD_INTERACTIONS_URL=https://your-tunnel.example.com/api/discord/interactions
DISCORD_INTERACTION_SESSION_TTL_MINUTES=15
SYNC_DISCORD_BOTS=false
DISCORD_GATEWAY_ENABLED=false
DISCORD_GATEWAY_INTENTS=Guilds,GuildMembers,GuildVoiceStates
DISCORD_GATEWAY_SHARD_COUNT=1
DISCORD_PRIMARY_GUILD_ID=
```

Notes:

- `DISCORD_BOT_TOKEN` is used for REST registration and message delivery.
- `DISCORD_PUBLIC_KEY` is used to verify Discord interaction signatures.
- `DISCORD_REGISTER_MODE=guild` is recommended for local testing because guild commands update quickly.
- `DISCORD_REGISTER_MODE=global` should be used for production rollout.
- `DISCORD_DEV_GUILD_ID` is required for guild-scoped registration.
- `DISCORD_INTERACTIONS_URL` must be public HTTPS for live Discord testing.
- `DISCORD_INTERACTION_SESSION_TTL_MINUTES` controls short-lived modal/upload session expiration. The default is 15 minutes.
- `SYNC_DISCORD_BOTS=false` keeps bot accounts out of portal users, profiles,
  roster statistics, readiness, attendance, and qualification data.
- `DISCORD_GATEWAY_ENABLED=false` keeps the long-running Gateway worker disabled
  by default. Enable it only when testing real-time guild events.
- `DISCORD_GATEWAY_INTENTS` should stay minimal. `MessageContent` is not required
  for slash commands, RSVP buttons, or attachment-option uploads.

## Local Startup

1. Start the web app:

```powershell
npm run dev
```

2. Optional: start the Gateway worker in a second terminal when testing real-time
   guild/member/voice events:

```powershell
npm run dev:gateway
```

3. Start a public HTTPS tunnel to local port 3000.

Ngrok example:

```powershell
ngrok http 3000
```

Cloudflare Tunnel example:

```powershell
cloudflared tunnel --url http://localhost:3000
```

4. Set:

```text
DISCORD_INTERACTIONS_URL=https://your-tunnel.example.com/api/discord/interactions
NEXT_PUBLIC_APP_URL=https://your-tunnel.example.com
AUTH_URL=https://your-tunnel.example.com
```

5. In Discord Developer Portal, set Interactions Endpoint URL to:

```text
https://your-tunnel.example.com/api/discord/interactions
```

Discord cannot call `localhost` on your machine. A tunnel is required for local webhook testing.

## Discord Developer Portal Checklist

OAuth2 redirect URL:

```text
https://your-tunnel.example.com/api/auth/callback/discord
```

For pure local browser OAuth without Discord interactions, this may be:

```text
http://localhost:3000/api/auth/callback/discord
```

Bot invite scopes:

```text
bot
applications.commands
```

Useful bot permissions:

- Send Messages
- Embed Links
- Use Slash Commands
- Read Message History
- Manage Roles only if testing role sync

Interactions Endpoint URL:

```text
https://your-tunnel.example.com/api/discord/interactions
```

## Command Registration

Check safe config and Discord API reachability:

```powershell
npm run discord:health
```

Run the full read-only platform readiness preflight:

```powershell
npm run discord:platform:preflight
```

Register commands to the configured scope:

```powershell
npm run discord:commands:register
```

List registered commands:

```powershell
npm run discord:commands:list
```

Clear development guild commands only:

```powershell
npm run discord:commands:clear:guild
```

The clear command only clears guild commands. It does not clear global commands.

Check Gateway health:

```powershell
npm run discord:gateway:health
```

## Testing `/help`

1. Confirm `npm run dev` is running.
2. Confirm your tunnel points to local port 3000.
3. Confirm the Discord Developer Portal Interactions Endpoint URL uses the tunnel URL.
4. Run `npm run discord:health`.
5. Run `npm run discord:commands:register`.
6. In the dev guild, type `/help`.

If `/help` appears but fails when submitted, the command registration worked but the interaction webhook is not reachable or signature validation is misconfigured.

If `/help` does not appear, the commands are not registered to the guild or the bot was invited without `applications.commands`.

## Testing `/apply`

Application commands are interaction-webhook compatible and do not require the Gateway worker.

1. Confirm `npm run dev` is running.
2. Confirm `DISCORD_INTERACTIONS_URL` points to the public tunnel URL.
3. Confirm at least one Portal form template is enabled for the current application type.
4. Run `npm run discord:commands:register`.
5. In the dev guild, test:

```text
/apply list
/apply info type:Recruit Application
/apply start type:Recruit Application
/apply status
```

The start command should return a short-lived Portal continuation link. The review message path requires a configured `staff-alerts` Discord channel mapping.

## Testing Identity Sync

1. Confirm a Discord server mapping exists under Administration -> Discord.
2. Run member sync from the Guild member sync card.
3. Open the Identity Sync section.
4. Confirm human members appear as imported or linked.
5. Confirm skipped bot count increases when the guild contains bots.
6. Log in through Discord OAuth with an imported human member.
7. Confirm the OAuth login links to the existing imported user/profile instead
   of creating a second active identity.

Use exact Discord ID duplicate merge only for duplicate groups shown in Identity
Sync. Display-name duplicate warnings are informational and must not be merged
automatically.

## Testing `/patrol`

Current status:

- `/patrol create` opens a modal and creates a portal Patrol event when the submitter has `patrols.create`, `patrols.lead`, or `discord.patrols.create`.
- `/patrol create` creates an ACTIVE `PATROL_CREATE` interaction session before the modal opens.
- `/patrol list` returns running patrols and patrols awaiting AAR when the submitter has `patrols.view` or `events.view`.
- `/patrol info patrol:<id-or-callsign>` returns a concise patrol summary.
- `/patrol end` marks the submitter's single running patrol complete, or accepts a patrol identifier when multiple matches exist.
- `/patrol aar` opens the same AAR modal pattern as `/aar`.
- `/patrol aar` stores pending AAR text context in an interaction session for `/patrol screenshot` continuation.
- `/patrol screenshot image:<file>` uploads the required map screenshot through a Discord slash-command attachment option.

Test sequence:

```powershell
npm run dev
npm run discord:health
npm run discord:commands:register
```

In Discord:

```text
/patrol create
/patrol list
/patrol info patrol:PTRL-W1-01
/patrol end patrol:PTRL-W1-01
/patrol aar
/patrol screenshot image:<attach PNG/JPG/WEBP>
```

Notes:

- Patrol announcement delivery uses the `patrols` Discord channel mapping.
- If no `patrols` mapping exists, the portal should still create the patrol and record a failed delivery instead of blocking the patrol.
- The Interested button records `PatrolRsvp` only. It does not mark final attendance.
- Clicking Interested again removes the caller's interest.
- Screenshot upload should create an `AarAttachment`, complete pending Discord screenshot state, and move the Patrol AAR to S3 review.

## Testing `/aar`

Current status:

- `/aar` opens a modal for Patrol AAR text fields.
- The modal resolves the linked portal user, resolves a Patrol event by ID/title, checks `aars.submit` or `s3.aars.submit`, creates the AAR, and leaves it in pending-map state until a screenshot is uploaded with `/patrol screenshot` or in the portal.
- Discord attachment continuation is implemented through `/patrol screenshot image:<file>`. Webhook-only mode cannot passively listen for ordinary channel image messages.
- Modal-backed AAR sessions expire after `DISCORD_INTERACTION_SESSION_TTL_MINUTES`.

In Discord:

```text
/aar
```

Use the modal fields:

- Patrol/event and patrol leader
- Tasking
- Callsigns
- FKIA / FWIA / FMIA / EKIA
- Report

Troubleshooting:

- If the modal opens but submit fails, the webhook is working and the portal service rejected linking, permission, or Patrol event resolution.
- If the modal says the session expired, run the command again and submit within the configured session TTL.
- If the modal does not open, check command registration, interaction endpoint reachability, and `DISCORD_PUBLIC_KEY`.
- If S3 cannot review the AAR, confirm the required map screenshot was uploaded through `/patrol screenshot` or the portal.

## Common Failures

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| Commands do not appear | Commands not registered, wrong guild ID, missing `applications.commands` scope | Set `DISCORD_REGISTER_MODE=guild`, set `DISCORD_DEV_GUILD_ID`, run `npm run discord:commands:register`, reinvite bot with scopes |
| Bot appears offline | Gateway worker is disabled or not running | This is expected for webhook-only testing; set `DISCORD_GATEWAY_ENABLED=true` and run `npm run dev:gateway` when online Gateway status is required |
| Discord Developer Portal rejects endpoint | Public key missing, route not reachable, tunnel down, invalid response | Set `DISCORD_PUBLIC_KEY`, run `npm run dev`, verify tunnel, set `/api/discord/interactions` URL |
| Command appears but says interaction failed | Webhook route unreachable or timed out | Check tunnel, Next dev server, endpoint URL, and logs |
| `/apply start` says application unavailable | Matching Portal `FormTemplate` is missing or disabled | Enable the recruit, RASP, or transfer form template in the Portal |
| `/apply start` returns an expired link | Continuation token expired or was already used | Run `/apply start` again |
| Application review alert does not post | Missing `staff-alerts` mapping or bot cannot post in mapped channel | Configure the mapping under Administration -> Discord and verify Send Messages and Embed Links |
| `/patrol create` modal opens but submit fails | User lacks patrol create permissions or portal cannot infer deployment defaults | Grant `patrols.create`, `patrols.lead`, or `discord.patrols.create`; verify at least one active/planning deployment exists if defaults are expected |
| Patrol announcement does not post | Missing `patrols` channel mapping or bot cannot post in mapped channel | Add an active `patrols` mapping under Administration -> Discord; verify Send Messages and Embed Links |
| `/aar` cannot find event | Modal patrol/event field does not match a Patrol event ID or title | Use exact Patrol event ID or exact title |
| AAR remains pending-map | Required map screenshot is not uploaded | Use `/patrol screenshot image:<file>` or upload PNG, JPG, JPEG, or WEBP in the portal AAR workflow |
| Modal submit says the session expired | The modal was submitted after `DISCORD_INTERACTION_SESSION_TTL_MINUTES` | Run the command again and submit within the timeout |
| 401 signature errors | Wrong `DISCORD_PUBLIC_KEY` | Copy Public Key from the same Discord application |
| 503 validation not configured | `DISCORD_PUBLIC_KEY` missing | Add it to `.env` and restart dev server |
| 401 Discord API from scripts | Invalid bot token | Regenerate/copy Bot Token, never client secret |
| 403 Discord API from scripts | Bot not in guild or lacks access | Invite bot to dev guild with `bot applications.commands` scopes |
| `Dev guild validation failed: Discord API 400: Invalid Form Body` | `DISCORD_DEV_GUILD_ID` is not a valid Discord snowflake | Copy the server ID from Discord Developer Mode and set `DISCORD_DEV_GUILD_ID` |

## Expected Local Commands

```powershell
npm run dev
npm run dev:gateway
npm run discord:health
npm run discord:platform:preflight
npm run discord:gateway:health
npm run discord:commands:register
npm run discord:commands:list
```

There is no `npm run dev:bot`; the long-running real-time process is `npm run dev:gateway`.
