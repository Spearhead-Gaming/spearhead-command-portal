# Discord Permission Analysis

Permission analysis records Discord-side capability metadata needed to understand whether the bot can safely perform future actions.

## Current State

The schema includes `DiscordPermissionSnapshot` for guild or resource capability summaries. Discovery records raw channel overwrites and role permission snapshots; full capability scoring remains a future extension.

## Safety Rules

- Do not bypass portal permissions because Discord grants a permission.
- Do not post staff-only information into public channels.
- Do not manage unmapped roles.
- Do not assume the bot can send, embed, manage messages, or manage roles until Discord-side capabilities are validated.

