# Plesk Update Runbook

## Standard Update

1. Announce the maintenance window if staging has active testers.
2. Pull the desired branch or tag.
3. Review pending migrations:

```bash
npm run prisma:validate
npm run db:status
```

4. Build new images:

```bash
COMPOSE_ENV_FILE=.env.staging docker compose build
```

5. Back up MariaDB and uploads.
6. Apply migrations:

```bash
COMPOSE_ENV_FILE=.env.staging docker compose --profile tools run --rm migrate
```

7. Restart web:

```bash
COMPOSE_ENV_FILE=.env.staging docker compose up -d web
```

8. Restart Gateway if enabled:

```bash
COMPOSE_ENV_FILE=.env.staging docker compose --profile gateway up -d gateway
```

9. Verify:

```bash
npm run staging:verify
```

## Rollback

1. Stop web and Gateway:

```bash
COMPOSE_ENV_FILE=.env.staging docker compose stop web gateway
```

2. Check out the previous known-good commit or image tag.
3. Restore the database backup if migrations were applied and are not backward compatible.
4. Restore uploaded files if the update changed file layout or resources.
5. Rebuild and start:

```bash
COMPOSE_ENV_FILE=.env.staging docker compose build
COMPOSE_ENV_FILE=.env.staging docker compose up -d web
```

6. Run `/api/health/ready` and the smoke test.

## Migration Rule

Do not run schema-altering migrations without a database backup. Prisma migration history must remain the source of truth for production-like environments.

## Discord Rule

Do not switch staging to global command registration unless the command set has already been verified. Keep staging on guild registration.
# Discord Scheduled Event Deployment Note

After deploying schema updates for Discord Event Management, run Prisma validation/generation and confirm the Gateway worker is still separate from the web process. REST Scheduled Event creation can function while Gateway is offline, but drift and participation observations resume only when Gateway is running.
