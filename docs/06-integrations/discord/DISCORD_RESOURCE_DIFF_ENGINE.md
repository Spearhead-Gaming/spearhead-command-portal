# Discord Resource Diff Engine

The resource diff engine compares previously discovered inventory with the latest Discord snapshot.

## Diff Keys

Resources are matched only by Discord ID within a managed guild.

## Diff Statuses

- Added
- Updated
- Renamed
- Moved
- PermissionChanged
- Missing
- OrphanedMapping
- Restored, reserved for future repair flows

## Safety

The diff engine does not infer identity from names. A deleted role recreated with the same name is treated as a missing old role and an added new role.

## Mapping Impact

Active channel and role mappings are included in impact summaries. Missing resources with active mappings are elevated because downstream notifications, role sync, or future automation may fail.

