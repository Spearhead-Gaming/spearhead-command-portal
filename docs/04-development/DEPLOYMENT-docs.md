# Deployment

## Recommended Environment

- Docker
- Plesk
- MariaDB
- Cloudflare

## Required Environment Variables

```text
DATABASE_URL=
AUTH_SECRET=
AUTH_URL=
AUTH_TRUST_HOST=false
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
DISCORD_PUBLIC_KEY=
DISCORD_APPLICATION_ID=
DISCORD_GUILD_ID=
ENABLE_DEV_LOGIN=false
DEV_LOGIN_SECRET=
DEV_LOGIN_EMAIL=
NEXT_PUBLIC_APP_NAME=
```

## Deployment Checklist

- Configure database
- Run migrations or the approved production schema migration process
- Seed initial data
- Configure Discord OAuth
- Invite Discord bot
- Map Discord servers/channels
- Verify login
- Verify notifications
- Keep developer bootstrap login disabled unless an operator is actively restoring access
- Run `npm run check` before promoting the build
