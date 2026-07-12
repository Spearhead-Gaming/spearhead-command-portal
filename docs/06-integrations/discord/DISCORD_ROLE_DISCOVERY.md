# Discord Role Discovery

Role discovery imports Discord role metadata into Portal inventory.

## Captured Metadata

- Discord role ID
- Guild ID
- Name
- Color
- Position
- Managed flag
- Hoist flag
- Mentionable flag
- Permission snapshot
- Missing/archived state
- Last seen and last synced timestamps

## Mapping Rules

Role mappings must remain explicit and portal-controlled. The Portal may manage only roles that administrators map for approved automation.

Never authorize a portal action by Discord role name or Discord role alone.

## Future Qualification Mapping

Role inventory supports future qualification-to-role and staff-role mapping review, but automation remains opt-in and mapping-based.

