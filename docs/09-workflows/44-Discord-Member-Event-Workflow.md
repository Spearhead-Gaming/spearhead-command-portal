# Discord Member Event Workflow

## Purpose

Describe how real-time Discord Gateway member events update portal identity
state without creating duplicate users or overwriting operational records.

## Triggers

- `GUILD_MEMBER_ADD`
- `GUILD_MEMBER_UPDATE`
- `GUILD_MEMBER_REMOVE`
- Manual guild sync fallback

## Actors

- Discord Gateway worker
- Discord member sync service
- Portal administrator reviewing diagnostics

## Permissions

- `discord.gateway.view`
- `discord.gateway.health.view`
- `discord.members.sync`
- `discord.identity.view`
- `discord.identity.merge`
- `audit.view`

## Workflow

1. Gateway worker receives a member event.
2. Dispatcher sends it to the member event handler.
3. Bot accounts are skipped unless bot sync is explicitly enabled in the future.
4. Handler resolves the mapped Discord server.
5. Identity service finds existing portal identity by Discord user ID.
6. If found, only Discord-owned identity fields are updated.
7. If not found, primary guild policy may create a placeholder user/profile.
8. Secondary guild policy should usually link only.
9. Leave events mark guild state as left and preserve portal history.
10. Gateway event logs and audit summaries provide visibility.

## Portal-Owned Fields

Member events must not overwrite:

- unit
- position
- status unless explicitly intended
- qualifications
- attendance
- notes
- applications
- portal roles or permissions

## Recovery

- Run manual guild sync to repair missed events.
- Use Administration -> Discord -> Identity Sync for exact Discord ID duplicate
  detection and merge.
- Never merge display-name matches automatically.

## Deferred

- Gateway-driven automatic role sync.
- Nickname sync execution.
- Deeper moderation reconciliation for ban and timeout drift beyond the initial observation model.
