# Discord Bot Architecture

## 1. Purpose

The Discord bot is the primary bridge between Spearhead's Discord workflows and the Spearhead Command Portal.

The bot should allow members and leadership to complete quick actions from Discord while keeping official records inside the portal.

## 2. Core Principle

> Discord is a client for the portal, not a separate source of truth.

Discord interactions should read from and write to portal services.

## 3. Bot Responsibilities

MVP responsibilities:

- Discord OAuth identity linking
- Guild member identity/presence sync into portal-controlled records
- Event announcements
- RSVP buttons
- Attendance reminders
- Basic slash commands
- Channel mapping
- Delivery status reporting
- Safe moderation actions, starting with audited kick support

Future responsibilities:

- Role sync
- Nickname sync
- Qualification alerts
- Promotion announcements
- Transfer alerts
- Approval buttons
- Staff-only workflows
- Discord modals for quick forms

## 4. Bot Name

Recommended:

```text
Spearhead C2 Bot
```

## 5. Integration Layers

### Portal Web App

Manages:

- settings
- channel mappings
- notification templates
- role mappings
- audit logs
- Discord health display

### Discord Bot Worker

The current implementation is interaction-webhook first. Slash commands, buttons,
and modals are handled by `POST /api/discord/interactions`, and command
registration is performed through REST scripts.

An optional long-running Gateway worker is available through `npm run
dev:gateway`. It is disabled by default with `DISCORD_GATEWAY_ENABLED=false` and
is used only for real-time events such as guild member joins/leaves, member
updates, voice-state awareness, role diagnostics, and approved attachment
continuation sessions. The Gateway worker must not replace webhook signature
validation or portal permission checks.

Webhook layer handles:

- slash commands
- button interactions
- select menus
- modals
- message posting
- delivery retries

Gateway layer handles:

- guild member join/update/leave events
- guild availability events
- voice state awareness
- role create/update diagnostics
- approved message attachment continuation sessions
- Gateway connection health and reconnect tracking

### Portal API / Services

The bot should call internal service functions or API endpoints for:

- RSVP updates
- profile lookup
- qualification lookup
- event lookup
- permission checks
- audit logging

## 6. Multi-Server Support

The bot must support multiple Discord servers.

Potential servers:

- Spearhead Command
- Reaper
- Misfit
- Gambler
- Viking

Each Discord server may map to:

- one unit
- multiple units
- community-wide channels

## 7. Required Discord Intents

Recommended minimum:

- Guilds
- Guild Members, when Gateway member sync or role/nickname sync is enabled
- Guild Voice States, when voice awareness is enabled
- Direct Messages, if DM reminders are implemented

Avoid unnecessary privileged intents unless required.

Message Content is not required for slash commands, buttons, modals, RSVP, or
attachment slash-command options. It should remain disabled unless a future
documented workflow explicitly needs ordinary message text.

## 8. MVP Discord Features

- Bot connection status
- Discord member sync status and logs
- Unit/server/channel mappings
- Event announcement message
- RSVP buttons
- Event reminder message
- `/profile`
- `/events`
- `/quals`
- `/help`
- `/kick`, staff-only and portal-permission checked
- Delivery failure logging

## 9. Guild Member Sync

Discord guild member events may create or update `User`, `MemberProfile`,
`DiscordMemberLink`, and `DiscordGuildMemberState` records. Sync may update
Discord identity fields such as display name, username, avatar, guild presence,
and join/leave state.

Discord bot accounts are skipped by default. `SYNC_DISCORD_BOTS=false` is the
expected setting for normal operation. Skipped bot accounts are recorded in
`DiscordSyncLog` as informational visibility, but they must not create `User` or
`MemberProfile` records and must not appear in readiness, attendance, roster,
qualification, or dashboard statistics. Bot synchronization may only occur when
`SYNC_DISCORD_BOTS=true` is explicitly enabled for a future supported workflow.

Discord sync must not overwrite portal-owned operational records such as unit,
position, qualifications, attendance, notes, or portal permissions.

Manual sync is available as a drift-correction safety net. Scheduled sync may be
added by a worker later, but it must use the same service layer and audit rules.

Gateway member events use the same identity services as manual sync. Discord ID
is the canonical external identity. Primary guilds may create placeholder
profiles for human members, while secondary guilds should usually run link-only
so the portal does not create duplicate member records.

## 10. Moderation

Moderation actions must use portal permissions and must be audited. Kick is the
first supported action. Ban and timeout remain permission/model-ready but should
not be exposed as destructive actions until confirmation flows and policy are
complete.

Discord role hierarchy and bot permissions can still prevent moderation. Those
failures must be shown clearly and must not change portal operational data.

## 11. Deferred Discord Features

- Advanced role sync
- Nickname sync
- Staff approval buttons
- Discord modal submissions
- Qualification award from Discord
- Transfer approval from Discord
- RASP workflow from Discord
