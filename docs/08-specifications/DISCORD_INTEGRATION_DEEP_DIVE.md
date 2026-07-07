# Discord Integration Deep Dive

## Purpose

This audit captures the current Discord implementation in the Spearhead Command Portal. It documents what exists, what is partial, what is missing, and what should be prioritized next.

The portal remains the source of truth. Discord is a client and delivery surface. Discord roles, messages, or channel state must not directly authorize portal actions.

## Current Architecture

The application is webhook-first plus Discord REST calls.

- OAuth login uses Auth.js/NextAuth with the Discord provider.
- Interactions use `POST /api/discord/interactions`.
- Signature validation uses `DISCORD_PUBLIC_KEY`.
- Slash commands are registered with REST scripts.
- Discord messages are posted through REST using `DISCORD_BOT_TOKEN`.
- No gateway bot worker or `discord.js` client process currently exists.
- Because there is no gateway process, the bot may appear offline even when slash commands work.

Local testing requires a public HTTPS tunnel for live interactions because Discord cannot call localhost.

## Runtime And Startup

Primary local commands:

```powershell
npm run dev
npm run discord:health
npm run discord:commands:register
npm run discord:commands:list
```

There is no `npm run dev:bot` script because there is no gateway worker. If a future gateway worker is added, it should be documented separately and must not bypass the existing webhook security model.

## Environment Variables

Supported Discord and URL variables:

- `DISCORD_BOT_TOKEN`: REST registration, message delivery, member sync, role sync, moderation.
- `DISCORD_CLIENT_ID`: OAuth client ID and optional application ID fallback.
- `DISCORD_CLIENT_SECRET`: OAuth client secret.
- `DISCORD_PUBLIC_KEY`: interaction signature validation.
- `DISCORD_APPLICATION_ID`: slash command registration application target.
- `DISCORD_REGISTER_MODE`: `guild` for local iteration, `global` for production rollout.
- `DISCORD_DEV_GUILD_ID`: guild command target for local development.
- `DISCORD_GUILD_ID`: legacy fallback for `DISCORD_DEV_GUILD_ID`.
- `DISCORD_INTERACTIONS_URL`: public HTTPS interaction endpoint.
- `DISCORD_INTERACTION_SESSION_TTL_MINUTES`: short-lived multi-step interaction
  session timeout. Defaults to 15 minutes.
- `AUTH_URL`: Auth.js base URL and portal URL fallback.
- `NEXT_PUBLIC_APP_URL`: public app URL and interaction URL fallback.
- `SYNC_DISCORD_BOTS`: defaults to false; bot accounts are skipped by member sync unless explicitly enabled.

Safe diagnostics exist in `src/server/discord/config.ts` and `scripts/discord.ts`. These diagnostics intentionally do not print secrets.

## Code Inventory

| Path | Purpose | Status | Dependencies | Notes |
| --- | --- | --- | --- | --- |
| `src/auth.ts` | Auth.js setup, Discord provider, OAuth identity linking | Implemented | Prisma adapter, Discord OAuth env, identity service | Links OAuth users to imported Discord identities through Discord ID. |
| `src/app/api/discord/interactions/route.ts` | Discord interaction route | Implemented | Interaction handler | POST only; node runtime. |
| `src/server/discord/interactions/validation.ts` | Ed25519 signature verification | Implemented | `DISCORD_PUBLIC_KEY`, Node crypto | No production bypass. |
| `src/server/discord/interactions/handler.ts` | PING, slash command, button, modal router | Partial | command executor, RSVP, patrols, AAR services | Webhook-safe AAR screenshot continuation uses `/patrol screenshot`; pending AAR text stays `pending-map` until the screenshot is attached. No passive gateway attachment listener. |
| `src/server/discord/interactions/event-rsvp.ts` | Event RSVP buttons and View Event button | Implemented | attendance service, auth identity lookup | Writes to portal attendance services. |
| `src/server/discord/interactions/sessions/` | Multi-step Discord interaction session manager | Implemented | Prisma, identity resolver, audit logs | Tracks modal/upload/approval continuations with 15-minute default expiration. |
| `src/server/discord/commands/catalog.ts` | Slash command definitions and registration payload | Implemented | config | Includes core, patrol, staff, role sync, and kick commands. |
| `src/server/discord/commands/execute.ts` | Slash command execution | Partial | Prisma, permissions, attendance, patrol, role sync, moderation | `/announce` is intentionally placeholder; `/patrol create` and `/aar` are modal-first in handler. |
| `src/server/discord/commands/register.ts` | Register, list, clear guild commands, health | Implemented | Discord REST, env config | Guild/global registration supported. |
| `scripts/discord.ts` | CLI diagnostics and command registration wrapper | Implemented | register module, dotenv | Provides `discord:health`, register, list, clear guild. |
| `src/server/discord/config.ts` | Env normalization and safe diagnostics | Implemented | process env | Handles legacy env aliases and localhost detection. |
| `src/server/discord/delivery/provider.ts` | Channel mapping resolution and Discord message send | Implemented | Notification service, Discord REST | Missing mappings create failed delivery records. |
| `src/server/discord/messages/builders.ts` | Reusable Discord embed/button payload builders | Implemented | Discord payload types | Event, RSVP, patrol, campaign, qualification, form, attendance, staff alert builders exist. |
| `src/server/discord/events.ts` | Event announcement to Discord | Implemented | events, notifications, delivery, deployment resources | Requires published event and permissions. |
| `src/server/discord/patrols.ts` | Patrol announcement delivery | Implemented | patrol event data, delivery provider | Uses `patrols` channel mapping and Interested/View buttons. |
| `src/server/discord/notifications.ts` | Notification-to-Discord builders and routing helper | Implemented | notification service, delivery provider | Used by qualification, form, attendance, campaign, CONOP/AAR hooks. |
| `src/server/discord/service.ts` | Server/channel/role mapping CRUD and test delivery | Implemented | Prisma, audit logs, delivery provider | Channel/role mapping changes are audited. |
| `src/server/discord/actions.ts` | Server actions for Discord admin UI | Implemented | permission helper, Discord services | Permissions enforced server-side. |
| `src/server/discord/queries.ts` | Discord admin overview data | Implemented | Prisma, health, identity, role sync, guild sync | Powers `/administration/discord`. |
| `src/server/discord/guild-members.ts` | Guild member sync, join/update/leave, kick moderation | Partial | Discord REST, identity, audit | Manual sync implemented; no gateway event consumer. |
| `src/server/discord/identity.ts` | Canonical Discord identity linking and duplicate merge | Implemented | Prisma, permissions, audit | Exact Discord ID merge exists; display-name matches are warnings. |
| `src/server/discord/role-sync.ts` | Role sync preview and manual run | Implemented | Discord REST, role mappings | Only explicitly mapped roles are touched. |
| `src/features/administration/components/discord-settings-page.tsx` | Discord admin UI | Implemented | Discord actions/queries, shared UI | Covers health, mappings, sync, identity, deliveries, moderation. |
| `src/app/(portal)/administration/discord/page.tsx` | Admin Discord route | Implemented | administration page export | Protected by server permission checks in page component. |
| `prisma/schema.prisma` Discord models | Persistence for mappings, identities, sync, moderation | Implemented | MariaDB provider | Unique Discord ID constraints exist on `User.discordId` and `DiscordMemberLink.discordUserId`. |
| `docs/04-development/DISCORD_LOCAL_TESTING.md` | Local setup guide | Updated | None | Documents webhook mode, tunnel, command tests. |

## Slash Command Audit

| Command | Status | Handler | Permission behavior | Response |
| --- | --- | --- | --- | --- |
| `/help` | Implemented | `executeHelpCommand` | Works even when unlinked; shows extra commands based on portal grants | Ephemeral |
| `/profile` | Implemented | `executeProfileCommand` | Self requires linked profile; other member requires `personnel.profile.view` | Ephemeral |
| `/quals` | Implemented | `executeQualificationsCommand` | Self allowed; other member requires `qualifications.record.view` | Ephemeral |
| `/events` | Implemented | `executeEventsCommand` | Requires `events.view`; unit-scoped filtering is considered | Ephemeral |
| `/rsvp` | Implemented | `executeRsvpCommand` | Requires linked user/profile and RSVP service permission checks | Ephemeral |
| `/myunit` | Implemented | `executeMyUnitCommand` | Requires `units.view` and linked profile | Ephemeral |
| `/patrol create` | Partial/implemented | Modal in interaction handler, submit calls `startPatrolAsActor` | Submit requires `patrols.create`, `patrols.lead`, or `discord.patrols.create` | Modal then ephemeral |
| `/patrol list` | Implemented | `executePatrolListCommand` | Requires `patrols.view` or `events.view` | Ephemeral |
| `/patrol info` | Implemented | `executePatrolInfoCommand` | Requires `patrols.view` or `events.view` | Ephemeral |
| `/patrol end` | Implemented | `executePatrolEndCommand` | Requires `patrols.complete`, `patrols.lead`, or `discord.patrols.manage` | Ephemeral |
| `/patrol aar` | Partial/implemented | Modal in interaction handler, submit calls AAR service | Submit requires `aars.submit` or `s3.aars.submit` | Modal then ephemeral |
| `/aar` | Partial/implemented | Modal in interaction handler, submit calls AAR service | Submit requires `aars.submit` or `s3.aars.submit` | Modal then ephemeral |
| `/attendance` | Implemented read-only staff summary | `executeAttendanceCommand` | Requires `attendance.view` or `attendance.record`; audits usage | Ephemeral |
| `/announce` | Placeholder | `executeAnnounceCommand` | Requires `notifications.send`; audits placeholder usage | Ephemeral |
| `/member` | Implemented staff lookup | `executeMemberCommand` | Requires `personnel.profile.view`; audits usage | Ephemeral |
| `/syncroles` | Implemented preview | `executeSyncRolesCommand` | Requires `discord.sync.view` or `discord.sync.run`; audits preview | Ephemeral |
| `/kick` | Implemented | `executeKickCommand` | Requires `discord.moderation.kick`; reason required; audits command and action | Ephemeral |

Missing slash commands:

- `/ban`
- `/timeout`
- Any public announcement command that posts directly from Discord
- Role sync run from Discord; current `/syncroles` is preview only

## Interaction Audit

Implemented interaction types:

- PING/PONG validation.
- Application commands.
- Message buttons:
  - `rsvp:<eventId>:yes|no|maybe`
  - `view-event:<eventId>`
  - `patrol-rsvp:<patrolId>:interested`
  - `view-patrol:<patrolId>`
- Modals:
  - `patrol-create-submit`
  - `aar-submit`
  - `patrol-aar-submit`
- Slash-command attachment continuation:
  - `/patrol screenshot image:<file>`
- Short-lived interaction sessions:
  - `PATROL_CREATE`
  - `PATROL_AAR`
  - prepared types for `AAR_SCREENSHOT_UPLOAD`, `DEPLOYMENT_PUBLISH`, `RESOURCE_UPLOAD`, and `APPROVAL_FLOW`

Security behavior:

- Signature validation is mandatory.
- Linked Discord identity is required for mutating interactions.
- Portal services perform authoritative permission checks.
- Responses for personal data and errors are ephemeral.

Known gaps:

- No select-menu workflows.
- No modal workflow for applications/forms.
- No passive message-create listener for arbitrary channel uploads because there is no gateway worker.
- No interaction update of RSVP counts on the original Discord message.
- Invalid interactions return safe, generic ephemeral messages but are not individually persisted as interaction logs.

## Identity Sync Audit

Current behavior:

- `User.discordId` is unique.
- `Account(provider, providerAccountId)` is unique.
- `DiscordMemberLink.discordUserId` is unique.
- `DiscordGuildMemberState(discordServerId, discordUserId)` is unique.
- OAuth linking searches Account, User, DiscordMemberLink, DiscordGuildMemberState, and transient Auth.js user records before picking a canonical user.
- Guild sync updates Discord identity fields only.
- Guild sync creates placeholder `User` and `MemberProfile` for humans when no existing identity is found.
- Bots are skipped by default when `SYNC_DISCORD_BOTS` is not `true`.
- Skipped bots are recorded in `DiscordSyncLog` and audited as informational events.
- Duplicate detection and exact Discord ID merge exist in `src/server/discord/identity.ts`.
- Administration -> Discord -> Identity Sync summarizes linked users, OAuth-linked users,
  imported human members, skipped bots, last sync state, duplicate counts, and
  environment readiness.
- Identity diagnostics use `discord.identity.view`; manual sync uses
  `discord.members.sync`; exact duplicate merge uses `discord.identity.merge`.
- Exact Discord ID duplicate merge archives duplicates and transfers operational
  records such as roster assignments, qualifications, attendance, applications,
  submission comments, approval decisions, notification deliveries, and AAR ownership
  to the canonical user/profile.

Known gaps:

- Join/update/leave functions exist, but there is no gateway worker or webhook source feeding live Discord gateway events.
- Display-name duplicate detection is informational only, as intended.

## Channel Mapping Audit

Implemented mapping keys:

- `announcements`
- `events`
- `attendance`
- `patrols`
- `conops`
- `intel`
- `staff-alerts`
- `admin-alerts`
- `qualification-alerts`
- `promotion-alerts`
- `campaign-updates`

Routing behavior:

- Unit-scoped mapping is attempted first when unit scope is available.
- Global active mapping is used as fallback.
- Missing mapping records a failed delivery.
- The provider does not guess channels.

Important mappings:

- Event announcements: `events`
- Patrol announcements: `patrols`
- S3/AAR alerts: `staff-alerts`
- CONOP publication: `conops`
- Qualification notices: `qualification-alerts`
- Campaign/deployment publication: `campaign-updates`
- Admin delivery failures: `admin-alerts` is available but not fully automated.

## Notification Delivery Audit

Implemented:

- Portal notification records.
- Notification delivery records.
- Discord channel delivery through REST.
- Failed delivery status and error messages.
- Admin visibility in `/administration/notifications` and `/administration/discord`.
- Failed notification dashboard card routes to `/administration/notifications`.
- Discord failures do not roll back most portal workflows.

Known gaps:

- Retry button is placeholder-level.
- Discord DM delivery is modeled but not implemented.
- Some hooks are portal-only placeholders and do not route to Discord yet.

## Patrol Discord Workflow Audit

Implemented:

- `/patrol create` modal.
- Portal Patrol event creation.
- Default active deployment/week inference.
- Discord patrol announcement through `patrols` mapping.
- Interested button writes `PatrolRsvp`.
- `/patrol list`.
- `/patrol info`.
- `/patrol end`.
- `/patrol aar` modal.
- `/patrol screenshot` map screenshot continuation.
- Portal audit logs for patrol start, completion, RSVP, and AAR submission.

Partial or missing:

- No passive "next image in channel" handling; upload continuation is slash-command based.
- No live Discord thread workflow.
- No automatic S3 assignment beyond notification routing.
- Interested is not final attendance by design.

## AAR Discord Workflow Audit

Implemented:

- AAR modal fields fit Discord's five-row modal limit:
  - Patrol/event and leader
  - Tasking
  - Callsigns
  - FKIA/FWIA/FMIA/EKIA casualty report
  - Report
- AAR service creates records and pending screenshot state.
- S3 review is blocked until the required map screenshot exists.
- S3/staff notification routing exists through `staff-alerts`.

Missing:

- Screenshot upload continuation from Discord.
- Discord attachment parsing.
- AAR modal cannot capture all portal review/progression fields due Discord modal limits.

## Event And Deployment Discord Audit

Implemented:

- Published event announcement action from the portal.
- Permission checks for `events.publish` and `discord.notifications.send`.
- Channel mapping resolution using `events`.
- RSVP buttons.
- View Event button.
- Weekly tasking fields in event announcement payload.
- Deployment resource links, including current mod preset links, when visible to members.
- Delivery status shown on event detail.

Partial or missing:

- Deployment publish messages are routed through notification hooks, but there is no separate Discord-only deployment announcement workflow comparable to event announcements.
- Weekly operation publish uses event/tasking data; richer Discord operation package presentation can be improved later.
- RSVP count updates on existing Discord messages are not implemented.

## Role Sync Audit

Implemented:

- Role mapping model and admin UI.
- Mapping types: unit, qualification, portal role, rank.
- Preview mode.
- Manual run.
- Only explicitly mapped roles are managed.
- Failures are logged in audit metadata and do not change portal data.

Known risks:

- Bot role hierarchy and Manage Roles permission are runtime Discord configuration issues and must be tested in a dev guild.
- Automatic role sync is intentionally not enabled.
- Nickname sync is configuration-only and disabled by default.

## Moderation Audit

Implemented:

- `/kick` command.
- Admin UI moderation history.
- Required reason.
- Portal permission `discord.moderation.kick`.
- Discord REST kick action.
- Audit logs for requested, succeeded, failed, and command usage.
- Friendly bot hierarchy and permission errors.

Missing:

- Ban workflow.
- Timeout workflow.
- Moderation action form in admin UI beyond the available server action surface.
- Moderation history export.

## Admin UI Audit

`/administration/discord` currently shows:

- Bot health and environment readiness.
- Connected servers.
- Channel mappings.
- Guild member sync.
- Identity sync diagnostics and exact duplicate merge.
- Role mappings.
- Role sync preview and manual run.
- Slash command catalog.
- Delivery status.
- Moderation history.
- Recent Discord audit activity.
- Nickname sync placeholder.
- Safety rules.

Known UI concerns:

- Page is dense and may need progressive disclosure after functionality stabilizes.
- Command registration state is a catalog/plan view, not a live Discord API list.
- Delivery retry is still placeholder-level.

## Security Audit

Verified:

- Discord roles do not directly grant portal permissions.
- Slash commands resolve Discord user ID to portal identity.
- Mutating command paths call portal services.
- Interaction signatures are mandatory.
- Tokens are not printed by diagnostics.
- Channel mapping resolution does not guess channels.
- Bot accounts are excluded from member sync by default.

Risks to monitor:

- Discord REST errors should remain sanitized before being shown to users.
- Staff-only payload builders must keep `visibility: "staff"` and use staff mappings.
- Any future gateway worker must reuse the same permission and identity services.
- Local tunnel URLs must not be left in production environment values.

## Production Checklist

- Set `DISCORD_REGISTER_MODE=global`.
- Set `DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN`, and `DISCORD_PUBLIC_KEY`.
- Set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the production HTTPS URL.
- Set the Developer Portal Interactions Endpoint URL to `https://portal.example.com/api/discord/interactions`.
- Invite the bot with `bot` and `applications.commands`.
- Grant Send Messages, Embed Links, Use Slash Commands, and Read Message History.
- Grant Manage Roles only if manual role sync is being tested or enabled.
- Keep `SYNC_DISCORD_BOTS=false` unless there is an explicit future bot-sync policy.
- Confirm Administration -> Discord -> Identity Sync shows zero exact Discord ID
  duplicates after any guild import or OAuth login test.
- Confirm `/help` works.
- Confirm event announcement delivery to a mapped `events` channel.
- Confirm RSVP button writes portal `AttendanceRecord`.
- Confirm missing channel mapping produces a failed delivery visible to admins.
- Confirm role sync preview before any manual role sync run.

## Recommended Next 5 Discord Tasks

1. Add passive gateway-based attachment listening only if the community decides ordinary channel image uploads should continue pending Patrol AARs without `/patrol screenshot`.
2. Add live command registration diagnostics to `/administration/discord` using the existing REST health helpers.
3. Implement delivery retry from admin notification/Discord pages.
4. Add ban and timeout moderation workflows only after policy and permissions are finalized.
5. Add optional gateway worker only if real-time guild events, attachment listeners, or presence are required; otherwise keep webhook-first architecture.

## Open Issues And Gaps

- No gateway worker means bot online status is not expected.
- No Discord DM delivery implementation.
- No select-menu workflows.
- No `/ban` or `/timeout`.
- No automatic role sync.
- No nickname sync execution.
- No original-message RSVP count update.
- No persisted per-interaction log table beyond audit logs and delivery records.
