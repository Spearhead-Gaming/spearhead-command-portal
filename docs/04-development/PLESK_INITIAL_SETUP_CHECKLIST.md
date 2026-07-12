# Plesk Initial Setup Checklist

## Server

- Install Docker Engine and Docker Compose plugin.
- Confirm Node is not required on the host for Docker-based deployment.
- Create the staging domain in Plesk.
- Enable HTTPS for the staging domain.
- Configure reverse proxy to `http://127.0.0.1:3000`.
- Restrict direct DB access from the public internet.

## Repository

- Clone the repository onto the Plesk host.
- Copy `.env.staging.example` to `.env.staging`.
- Replace every placeholder value.
- Keep `.env.staging` out of git.
- Set `COMPOSE_ENV_FILE=.env.staging` for deployment commands.

## Required Environment

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `AUTH_TRUST_HOST=true`
- `NEXT_PUBLIC_APP_URL`
- `FILE_STORAGE_ROOT=/app/storage`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_PUBLIC_KEY`
- `DISCORD_APPLICATION_ID`
- `DISCORD_BOT_TOKEN` if command registration, Discord posting, or Gateway is used

## Preflight

Run from a shell with the staging env loaded:

```bash
npm run env:check -- --target=staging --check-files
npm run prisma:validate
```

After containers are available:

```bash
COMPOSE_ENV_FILE=.env.staging docker compose --profile tools run --rm migrate
npm run staging:verify
```

## Backups

Before first real data entry:

- Confirm MariaDB volume backup location.
- Confirm uploaded file volume backup location.
- Test restoring a DB dump into a disposable database.
- Record who can access `.env.staging`.

## Discord Developer Portal

- OAuth redirect URL: `https://staging.example.com/api/auth/callback/discord`
- Interaction endpoint: `https://staging.example.com/api/discord/interactions`
- Scopes: `bot`, `applications.commands`
- Bot permissions as needed: Send Messages, Embed Links, Use Slash Commands, Read Message History, Manage Roles only when testing role sync.
