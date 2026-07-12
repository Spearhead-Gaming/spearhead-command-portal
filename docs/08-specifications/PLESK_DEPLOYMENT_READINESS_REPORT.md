# Plesk Deployment Readiness Report

## Recommendation

Use Docker Compose on Plesk for staging and production-like testing.

## Why Not Plain Plesk Node.js

Plain Plesk Node.js is viable only for the Next.js web process. It does not provide a clean first-class path for:

- MariaDB lifecycle and health
- optional Discord Gateway worker
- one-off Prisma migration runner
- persistent upload volume
- consistent rollback between app, database, and files

## Runtime Components

- Web: Next.js standalone server.
- Gateway: optional Discord Gateway worker.
- Database: MariaDB 11.4.
- File storage: mounted upload volume at `/app/storage`.
- Reverse proxy: Plesk HTTPS proxy to `127.0.0.1:3000`.
- Production domain: `https://portal.shgmilsim.com`.

## Added Readiness Hooks

- `/api/health/live`
- `/api/health/ready`
- `/api/health`
- `npm run env:check`
- `npm run staging:preflight`
- `npm run staging:verify`

## Migration Readiness

Prisma schema validation is supported. This repository currently does not have a `prisma/migrations` directory, so staging promotion should include creating and applying real migrations before production data is used.

## Security Readiness

- Production-like env validation rejects placeholder secrets.
- Production requires HTTPS app URLs.
- Production `AUTH_URL` and `NEXT_PUBLIC_APP_URL` should be `https://portal.shgmilsim.com`.
- Production Discord interaction endpoint should be `https://portal.shgmilsim.com/api/discord/interactions`.
- Production Discord OAuth redirect URL should be `https://portal.shgmilsim.com/api/auth/callback/discord`.
- Production rejects `ENABLE_DEV_LOGIN=true`.
- Staging and non-production environments are noindexed.
- Secrets are never printed by validation scripts.

## Backup Readiness

Required before real staging usage:

- MariaDB backup process.
- Upload volume backup process.
- Restore test into a disposable environment.

## Remaining Blockers Before Production

- Create actual Prisma migrations from the current schema.
- Decide whether the Discord Gateway worker is required for production.
- Configure real Plesk domain, TLS, and reverse proxy.
- Configure real Discord OAuth and interaction endpoint values.
- Verify backup and restore.
- Run the smoke test with real staging credentials.
