# MariaDB Standards

## General

- Use InnoDB
- Use utf8mb4
- Use relational constraints where supported
- Index frequently queried fields
- Avoid storing arrays as strings when relational tables make sense

## Common Indexes

- discordId
- unitId
- profileId
- eventId
- campaignId
- createdAt
- status

## Backups

Production deployments should have regular database backups.
