# Discord Intents And Features

Gateway intent usage must stay explicit.

| Intent | Default | Privileged | Features |
| --- | --- | --- | --- |
| `Guilds` | Enabled | No | Gateway health, guild availability, channel/role inventory |
| `GuildMembers` | Enabled when approved | Yes | Member join/leave/update sync |
| `GuildVoiceStates` | Enabled | No | Voice awareness |
| `GuildScheduledEvents` | Optional | No | External scheduled event observation |
| `GuildMessages` | Optional | No | Attachment continuation |
| `MessageContent` | Disabled | Yes | Not currently required |

## Policy

Enable only the intents required by documented workflows. Do not enable `MessageContent` for broad monitoring.
