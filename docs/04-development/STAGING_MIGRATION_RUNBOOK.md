# Staging Migration Runbook

## Before Running Migrations

- Confirm this is staging, not production.
- Confirm `COMPOSE_ENV_FILE=.env.staging`.
- Back up the MariaDB volume or create a SQL dump.
- Back up the upload volume if the release changes resource/file behavior.
- Run `npm run prisma:validate`.

## Check Migration Status

```bash
npm run db:status
```

When checking inside Compose:

```bash
COMPOSE_ENV_FILE=.env.staging docker compose --profile tools run --rm migrate npm run db:status
```

## Deploy Migrations

```bash
COMPOSE_ENV_FILE=.env.staging docker compose --profile tools run --rm migrate
```

## Verify

```bash
npm run staging:verify
```

Also verify:

- Login works.
- Dashboard loads.
- A deployment/resource page with uploaded files loads.
- Discord admin health page loads if configured.

## Rollback

Prisma deploy migrations are forward-only. If a migration has changed the schema and rollback is required:

1. Stop web and Gateway.
2. Restore the database backup taken before migration.
3. Restore uploaded files if needed.
4. Check out or redeploy the previous application version.
5. Restart and run health checks.
