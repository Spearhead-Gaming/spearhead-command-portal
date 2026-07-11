# Discord Voice Awareness

## Purpose

Voice awareness can show lightweight presence context for command staff. It is
not attendance, RSVP, participation, or readiness.

## Behavior

- `VOICE_STATE_UPDATE` is consumed only when the Discord server mapping has voice
  awareness enabled.
- Join-like updates create an active `DiscordVoiceSession`.
- Leave-like updates close active sessions.
- Unknown Discord users are recorded by Discord ID only.

## Safety Rules

- Never mark attendance from voice.
- Never penalize members for not being in voice.
- Never use voice sessions as qualification or readiness proof.
- Keep voice awareness disabled on servers that do not need it.

## Future Uses

- Patrol staging awareness.
- S3 observation during live operations.
- Admin diagnostics for bot visibility.
