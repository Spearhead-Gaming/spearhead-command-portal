# Plesk Troubleshooting

## Web Container Starts But Plesk Shows 502

- Confirm the container is bound to `127.0.0.1:3000`.
- Confirm Plesk proxies to `http://127.0.0.1:3000`.
- Check `docker compose ps`.
- Check `docker compose logs web --tail=100`.
- Confirm `/api/health/live` responds from the Plesk host.

## Readiness Fails

Check:

- `DATABASE_URL` points to `db` when using the Compose MariaDB service.
- MariaDB container is healthy.
- Prisma migrations have run.
- `FILE_STORAGE_ROOT=/app/storage`.
- The `uploads` volume is mounted.

## Discord OAuth Fails

Check:

- `AUTH_URL` matches the public HTTPS domain.
- Discord OAuth redirect URL is `https://staging.example.com/api/auth/callback/discord`.
- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are from the same Discord application.
- `AUTH_SECRET` is not a placeholder and has not changed unexpectedly.

## Discord Interactions Fail

Check:

- Discord Developer Portal interaction endpoint is `https://staging.example.com/api/discord/interactions`.
- `DISCORD_PUBLIC_KEY` is configured.
- Plesk HTTPS certificate is valid.
- `/api/health/live` is reachable publicly.
- Slash commands were registered for the expected guild or globally.

## Gateway Worker Does Not Start

Check:

- Start it with the `gateway` profile.
- `DISCORD_GATEWAY_ENABLED=true` when the worker should actively connect.
- `DISCORD_BOT_TOKEN` is configured.
- Required Gateway intents are enabled in the Discord Developer Portal.
- Logs do not reveal secrets; token values should never be printed.

## Uploads Or Downloads Fail

Check:

- `FILE_STORAGE_ROOT=/app/storage`.
- `uploads` volume exists.
- Container user can write to `/app/storage`.
- Plesk disk quota is not exhausted.

## Useful Commands

```bash
COMPOSE_ENV_FILE=.env.staging docker compose ps
COMPOSE_ENV_FILE=.env.staging docker compose logs web --tail=100
COMPOSE_ENV_FILE=.env.staging docker compose logs gateway --tail=100
COMPOSE_ENV_FILE=.env.staging docker compose exec web node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>r.text()).then(console.log)"
```
