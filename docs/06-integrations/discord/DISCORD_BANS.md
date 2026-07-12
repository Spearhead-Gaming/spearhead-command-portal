# Discord Bans

Bans and unbans are high-impact case-backed moderation actions.

## Rules

- Ban and unban require `discord.moderation.ban`.
- Bans must attach to a `CommunityCase`.
- Ban history remains in the Portal even if the Discord ban is later lifted.
- Discord REST performs the ban or unban after validation and approval policy checks.
- Evidence should be attached to the case when policy requires it.

## Safety

Never delete Portal identity or member history when banning a Discord user.

Cross-guild bans must never be automatic by assumption. They may only become recommendations or explicit staff actions according to guild policy.
