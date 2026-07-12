# Plesk Staging Deployment

## Discord Resource Discovery Notes

- Configure `DISCORD_BOT_TOKEN` securely in environment variables.
- Do not log the bot token.
- Run `npm run prisma:generate` after schema changes.
- Run `npm run db:migrate:deploy` once migrations exist for the target environment.
- Verify `/administration/discord` loads for administrators with discovery permissions.
- Run dry-run discovery before the first full discovery against a production guild.

## Recommended Method

Use Docker Compose on the Plesk host.

The portal is not just a single Node process. A production-like staging stack needs:

- Next.js web runtime
- MariaDB
- persistent uploaded files/resources
- optional Discord Gateway worker
- one-off migration tooling
- repeatable health checks

Plesk Node.js hosting can run the web process, but it does not cleanly model the gateway worker, database, persistent upload volume, and repeatable rollback path. Docker Compose keeps staging close to production and lets Plesk act as the HTTPS reverse proxy.

## Architecture

- `web`: Next.js standalone server listening on container port `3000`.
- `gateway`: optional Discord Gateway worker, enabled with the `gateway` Compose profile.
- `db`: MariaDB 11.4 with a persistent named volume.
- `migrate`: one-off Prisma migration runner, enabled with the `tools` Compose profile.
- `uploads`: persistent volume mounted at `/app/storage`.

Plesk should proxy HTTPS traffic to `http://127.0.0.1:3000`.

If port `3000` is already used by another application on the same Plesk host, set `WEB_PORT` to an available starting port. `npm run start` will scan upward from `WEB_PORT` and start on the first available port unless `PORT_AUTO_INCREMENT=false`.

## First Deploy

1. Copy `.env.staging.example` to `.env.staging` on the server.
2. Replace every placeholder value.
3. Set `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, and `DISCORD_INTERACTIONS_URL` to the public HTTPS staging domain.
4. Set `COMPOSE_ENV_FILE=.env.staging` before running Compose commands.
5. Build the images:

```bash
COMPOSE_ENV_FILE=.env.staging docker compose build
```

If using Plesk's Node.js application builder instead of Docker, set the build command to:

```bash
npm run build
```

Do not use `next build` directly in Plesk. The project build script regenerates Prisma Client before Next.js type-checks so generated Prisma types stay aligned with `prisma/schema.prisma`.

6. Start MariaDB:

```bash
COMPOSE_ENV_FILE=.env.staging docker compose up -d db
```

7. Run migrations:

```bash
COMPOSE_ENV_FILE=.env.staging docker compose --profile tools run --rm migrate
```

8. Start the web app:

```bash
COMPOSE_ENV_FILE=.env.staging docker compose up -d web
```

9. If the Gateway worker is needed:

```bash
COMPOSE_ENV_FILE=.env.staging docker compose --profile gateway up -d gateway
```

## Plesk Reverse Proxy

Configure the staging or production domain to proxy to:

```text
http://127.0.0.1:3000
```

Use HTTPS at the Plesk layer. The app should still receive:

- `AUTH_TRUST_HOST=true`
- `AUTH_URL=https://staging.example.com`
- `NEXT_PUBLIC_APP_URL=https://staging.example.com`

For production, Spearhead's canonical portal domain is:

```text
https://portal.shgmilsim.com
```

Production environment values should use:

```text
AUTH_URL=https://portal.shgmilsim.com
NEXT_PUBLIC_APP_URL=https://portal.shgmilsim.com
DISCORD_INTERACTIONS_URL=https://portal.shgmilsim.com/api/discord/interactions
WEB_BIND=127.0.0.1
WEB_PORT=3000
```

If auto-increment selects a different port, update the Plesk proxy target to the port printed by `npm run start`. For long-term production, a dedicated fixed `WEB_PORT` is still preferred so the reverse proxy target remains stable.

## Health Checks

- Liveness: `/api/health/live`
- Readiness: `/api/health/ready`
- Combined: `/api/health`

Readiness checks database connectivity and writable file storage. Discord and Gateway status are reported as degraded when not configured, not as fatal web readiness failures.

## Discord

For webhook interactions, Discord Developer Portal must point to:

```text
https://staging.example.com/api/discord/interactions
```

For production, use:

```text
https://portal.shgmilsim.com/api/discord/interactions
```

The production Discord OAuth redirect URL must be:

```text
https://portal.shgmilsim.com/api/auth/callback/discord
```

Guild command registration is recommended for staging:

```bash
npm run discord:commands:register
```

Run this inside the container or from a workstation with the same staging Discord environment values.

## Staging Banner And Noindex

Set `APP_ENV=staging`.

This enables a visible staging banner in the authenticated workspace and returns a noindex/disallow robots policy for non-production environments.
