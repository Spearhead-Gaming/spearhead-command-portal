# Discord Gateway Attachment Continuation

Attachment continuation supports scoped multi-step workflows, such as a future Patrol AAR screenshot upload after a slash command/modal flow.

## Rules

- Only process attachments when an active interaction session is waiting for them.
- Never broadly monitor message content.
- Prefer attachment metadata over message text.
- Do not require `MessageContent` for attachment continuation unless a future workflow explicitly needs it.
- Expired or missing sessions should result in skipped informational events.

## Required Intent

`GuildMessages`

`MessageContent` is disabled by default and should remain disabled unless a documented workflow requires it.
