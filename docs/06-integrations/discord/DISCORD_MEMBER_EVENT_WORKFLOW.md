# Discord Member Event Workflow

## Trigger

Discord Gateway emits `GUILD_MEMBER_ADD`, `GUILD_MEMBER_UPDATE`, or
`GUILD_MEMBER_REMOVE`.

## Flow

1. Gateway dispatcher routes the event to the member handler.
2. Bot accounts are skipped by default.
3. The handler resolves the mapped `DiscordServer`.
4. The identity service searches by canonical Discord user ID.
5. Existing users/profiles are updated with Discord-owned identity fields only.
6. Primary guilds may create placeholder profiles for human members.
7. Secondary guilds should usually link only.
8. Leave events mark guild membership left without deleting portal records.

## Portal-Owned Fields

Gateway member events must not overwrite:

- unit
- position
- qualifications
- attendance
- notes
- portal status unless explicitly approved
- permissions or role assignments

## Audit And Logs

- Sync summaries are recorded in Discord sync/gateway logs.
- Exact duplicate cleanup remains an admin-controlled workflow.
- Display-name duplicate warnings are informational only.
