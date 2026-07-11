# Discord Intents and Security

## Default Gateway Intents

```text
DISCORD_GATEWAY_INTENTS=Guilds,GuildMembers,GuildVoiceStates
```

| Intent | Why It Exists |
| --- | --- |
| `Guilds` | Gateway ready/guild availability and role diagnostics |
| `GuildMembers` | Human member join/update/leave identity sync |
| `GuildVoiceStates` | Optional voice awareness suggestions |

## Avoid by Default

| Intent | Reason |
| --- | --- |
| `MessageContent` | Not needed for slash commands, buttons, modals, RSVP, or attachment command options |
| `DirectMessages` | DM delivery is not implemented yet |
| Broad moderation intents | Moderation workflows need explicit policy first |

## Privileged Intent Checklist

Before enabling privileged intents:

- Document the workflow that requires the intent.
- Confirm the Discord Developer Portal setting is enabled.
- Confirm the worker environment includes the intent.
- Confirm the admin UI explains the behavior.
- Confirm audit and privacy rules are defined.

## Security Rules

- Never log bot tokens, public keys, OAuth secrets, or raw authorization headers.
- Never treat Discord role membership as portal authorization.
- Never create operational truth from voice presence.
- Never post staff-only information into public mapped channels.
- Never auto-sync roles or nicknames unless the workflow is explicitly enabled.
