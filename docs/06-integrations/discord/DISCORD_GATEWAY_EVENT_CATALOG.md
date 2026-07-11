# Discord Gateway Event Catalog

## Implemented Events

| Event | Intent | Handler | Portal Effect |
| --- | --- | --- | --- |
| `READY` | `Guilds` | `discord.gateway.ready` | Records bot username, guild count, session, and health |
| `RESUMED` | `Guilds` | `discord.gateway.resumed` | Marks Gateway connected after resume |
| `GUILD_CREATE` | `Guilds` | `discord.gateway.guild-create` | Logs guild availability |
| `GUILD_DELETE` | `Guilds` | `discord.gateway.guild-delete` | Logs guild unavailable/removed state |
| `GUILD_MEMBER_ADD` | `GuildMembers` | `discord.gateway.member-add` | Syncs human Discord identity through portal services |
| `GUILD_MEMBER_REMOVE` | `GuildMembers` | `discord.gateway.member-remove` | Marks guild member left while preserving portal records |
| `GUILD_MEMBER_UPDATE` | `GuildMembers` | `discord.gateway.member-update` | Updates Discord-owned identity fields only |
| `VOICE_STATE_UPDATE` | `GuildVoiceStates` | `discord.gateway.voice-state` | Records optional non-authoritative voice session suggestions |
| `MESSAGE_CREATE` | `GuildMessages` | `discord.gateway.message-attachment-continuation` | Completes approved image attachment continuation sessions only |
| `GUILD_ROLE_CREATE` | `Guilds` | `discord.gateway.role-create` | Logs role mapping diagnostics |
| `GUILD_ROLE_UPDATE` | `Guilds` | `discord.gateway.role-update` | Logs role mapping diagnostics |

## Event Safety Rules

- Do not create users/profiles for bot accounts unless `SYNC_DISCORD_BOTS=true`
  is explicitly supported in a future workflow.
- Do not infer attendance from voice.
- Do not authorize from Discord roles.
- Do not guess channels.
- Do not ingest arbitrary message content.
- Do not make Discord the source of truth for operational fields.

## Deferred Events

- `GUILD_MEMBER_BAN_ADD`
- `GUILD_MEMBER_BAN_REMOVE`
- `GUILD_ROLE_DELETE`
- `THREAD_CREATE`
- `THREAD_UPDATE`
- `MESSAGE_REACTION_ADD`
- `MESSAGE_REACTION_REMOVE`

Deferred events require explicit permissions, audit behavior, and privacy review
before implementation.
