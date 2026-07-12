# Production Checklist

Use this checklist before promoting the Spearhead Command Portal to a first production deployment or v1 release candidate.

## Environment

- `DATABASE_URL` points to the production MariaDB database.
- `AUTH_SECRET` is a strong production-only secret.
- `AUTH_URL=https://portal.shgmilsim.com`.
- `NEXT_PUBLIC_APP_URL=https://portal.shgmilsim.com`.
- `AUTH_TRUST_HOST` is set intentionally for the hosting environment.
- `DISCORD_INTERACTIONS_URL=https://portal.shgmilsim.com/api/discord/interactions`.
- Discord OAuth values are configured for the production Discord application.
- Discord OAuth redirect URL is `https://portal.shgmilsim.com/api/auth/callback/discord`.
- Discord bot values are configured only after channel and permission review.
- `ENABLE_DEV_LOGIN=false` unless an operator is actively restoring access.
- `DEV_LOGIN_SECRET` is not reused from local development and is blank when dev login is disabled.
- `.env` is never committed.

## Database

- Prisma schema validates with `npm run prisma:validate`.
- Prisma Client generation succeeds with `npm run prisma:generate`.
- Production/Plesk builds use `npm run build`, not `next build`, so Prisma Client is regenerated before Next.js type-checks.
- Production migrations or approved schema changes have been reviewed before applying.
- Seed data has been run or verified for permissions, starter roles, statuses, units, forms, and catalogs.
- Database backups are configured and a restore procedure has been tested.
- MariaDB user permissions are least-privilege for the deployed app.

## Authentication And Permissions

- Discord OAuth login works with production callback URLs.
- Protected portal routes redirect unauthenticated users to `/login`.
- Authorization checks use permission keys, not role names.
- Unit-scoped permissions are verified for at least one scoped role assignment.
- Developer bootstrap attempts are audited and the route is hidden from public navigation.
- Users without member profiles see a clear linked-profile state.

## Security

- No secrets are present in source, docs, logs, or seed data.
- API routes validate external input and handle failure without leaking sensitive details.
- Discord interaction signature validation is enabled for production paths.
- Discord roles are never treated as portal authority.
- Portal services remain the source of truth for Discord commands and interactions.
- Sensitive actions write audit logs with consistent event names.

## UI And Accessibility

- Core routes have loading, empty, error, unauthorized, forbidden, and not-found states.
- Keyboard navigation works through the sidebar, top bar, drawers, forms, and command palette.
- Icon-only buttons have accessible labels.
- Form fields have visible labels or appropriate accessible names.
- Drawer/modal focus behavior is checked manually.
- Contrast is readable in the dark command-center theme.
- Mobile layouts remain usable for dashboard, roster, event, qualification, Discord, and admin pages.

## Notifications And Discord

- Notification failures do not block personnel, qualification, event, campaign, S3, or form workflows.
- Failed deliveries are visible from administration surfaces.
- Discord channel mappings exist before posting workflow messages.
- The bot never guesses channels or posts staff-only information publicly.
- Role sync only manages explicitly mapped roles and is manually triggered.

## Performance And Reliability

- `npm run check` passes.
- Initial dashboard and major list pages load without obvious duplicate requests.
- Prisma queries are kept in server services/queries rather than client components.
- Large lists have filters and bounded query limits where practical.
- Blank white page failures are caught by route error boundaries.

## Operations

- The deployment process documents how to run migrations, seed data, start the app, and roll back.
- Plesk proxy target matches the configured `WEB_BIND` and `WEB_PORT`, or the selected auto-increment port printed at startup.
- Logs are available for Next.js runtime, MariaDB, and reverse proxy failures.
- Health checks or external monitoring are configured for the app route and database connectivity.
- A maintenance plan exists for disabling dev login immediately after emergency use.
