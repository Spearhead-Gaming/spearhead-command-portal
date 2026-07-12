# Discord Event Routing

Event routing resolves eligible managed guilds from Portal event context and guild policy.

## Default Targets

- Primary Community Discord for community-wide events.
- Owning Unit Discord when a Unit has an associated managed guild.
- Spearhead Command uses the Primary Community Discord and does not require a Unit guild.

## Rules

- Do not hardcode guild IDs.
- Do not manually enter channel IDs when discovery inventory exists.
- Do not assume every event needs a Discord Scheduled Event.
- Missing or disabled policy blocks the target until staff configures it.
