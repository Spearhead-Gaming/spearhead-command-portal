# Spearhead Command Portal

Custom command-center portal for the Spearhead Arma 3 community. The portal is the source of truth for personnel, roster assignments, qualifications, events, attendance, campaigns, documents, applications, notifications, Discord integration, and administration.

Discord is a first-class client, but portal services and the MariaDB database remain authoritative.

## Stack

- Next.js App Router with TypeScript and Tailwind CSS.
- Prisma ORM targeting MariaDB through the MySQL connector.
- Auth.js / NextAuth with Discord OAuth and an environment-gated developer bootstrap route.
- Feature-first application structure under `src/features`.
- Shared UI primitives under `src/components`.
- Server services, permission helpers, database utilities, and integration code under `src/server`.

## Local Setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Start MariaDB and update `DATABASE_URL`.
4. Configure Discord OAuth values when testing normal login.
5. Run `npm install`.
6. Run `npm run prisma:generate`.
7. Run `npx prisma db push` for local schema sync, then `npm run prisma:seed`.
8. Run `npm run dev`.

Developer bootstrap login is hidden at `/internal/bootstrap` and is disabled unless `ENABLE_DEV_LOGIN=true` and `DEV_LOGIN_SECRET` are set. Keep it disabled outside a temporary maintenance window.

## Verification

Run the full release-candidate check before handoff:

```bash
npm run check
```

The command runs Prisma validation, lint, TypeScript checking, and a production build.

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run prisma:validate
npm run prisma:format
npm run prisma:generate
npm run prisma:seed
```

## Documentation

Start with `CODEX.md`, then review `docs/engineering`, `docs/01-architecture`, `docs/02-ui`, and `docs/04-development`. Production readiness work should also use `docs/04-development/PRODUCTION_CHECKLIST.md`.
