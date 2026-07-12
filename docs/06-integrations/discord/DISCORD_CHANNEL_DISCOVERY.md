# Discord Channel Discovery

Channel discovery imports Discord channel metadata into Portal inventory.

## Captured Metadata

- Discord channel ID
- Guild ID
- Parent channel/category ID
- Name
- Channel type
- Position
- NSFW flag
- Permission overwrite snapshot
- Missing/archived state
- Last seen and last synced timestamps

## Supported Types

Text, voice, category, announcement, thread, stage, forum, and unknown types are normalized into stable labels.

## Mapping Rules

Channel mappings must remain explicit. Discovery may make channels selectable in admin UI, but it must not guess announcement, event, operations, staff, or system destinations.

