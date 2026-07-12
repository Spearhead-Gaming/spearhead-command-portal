# Guild Discovery

Guild discovery imports Discord inventory into the portal without changing administrator mappings.

## Discovery Sources

Phase 4 Epic 1 supports configured guild discovery using known guild IDs from environment/configuration and managed guild records.

Future improvements may use Gateway READY guild lists or operator-selected OAuth scopes where appropriate.

## Imported Data

Discovery can store:

- guild metadata
- channels
- categories
- threads when returned by Discord APIs
- roles
- scheduled event counts in future iterations
- permission snapshots

## What Discovery Must Not Do

Discovery must not:

- create channel mappings automatically
- authorize portal users
- grant portal permissions
- modify Discord roles
- overwrite administrator configuration
- delete portal data

## Inventory Refresh

When inventory is refreshed:

- existing channel and role inventory is upserted
- missing channels or roles are marked archived
- a `DiscordGuildDiscoverySnapshot` is created
- an audit log records the import

## Operator Flow

1. Bootstrap or create a managed guild.
2. Run discovery.
3. Review discovered channel and role inventory.
4. Create explicit channel mappings.
5. Create explicit role mappings only for roles the portal is allowed to manage.
