# Guild Discovery Workflow

Guild discovery is a guided administrator workflow for importing Discord inventory as reference data.

## Steps

1. Connect or bootstrap the primary community guild.
2. Fetch configured guilds.
3. Select a managed guild.
4. Preview inventory with a dry-run discovery when impact is unclear.
5. Run full or targeted discovery.
6. Review discovered channels, roles, scheduled events, emoji, and stickers.
7. Review reconciliation items.
8. Finish by creating or updating explicit mappings where needed.

## Rules

Discovery must be idempotent.

Discovery must not:

- grant portal permissions
- authorize by Discord role
- create channel mappings automatically
- modify Discord roles
- overwrite administrator configuration
- delete portal records
- remap resources by name

## Import Behavior

Imported resources are upserted into the portal. Missing inventory rows are marked missing/archived, not deleted.

Each import creates a discovery snapshot and audit log entry.
