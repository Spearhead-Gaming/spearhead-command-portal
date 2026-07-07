# Discord Interaction Session Manager

## Purpose

The Discord Interaction Session Manager provides a reusable portal-side state layer for multi-step Discord workflows.

It exists because Discord interactions often split one operational action across several moments:

- slash command opens a modal
- modal submit creates or stages portal data
- later button, confirmation, or upload continues the workflow
- final step completes, cancels, expires, or fails the workflow

The portal remains the source of truth. Discord is only the client surface.

## Data Model

`DiscordInteractionSession` tracks one short-lived workflow session.

Core fields:

- `discordUserId`
- `portalUserId`
- `memberProfileId`
- `guildId`
- `channelId`
- `commandName`
- `workflowType`
- `currentStep`
- `status`
- `temporaryPayload`
- `relatedEntityType`
- `relatedEntityId`
- `expiresAt`
- `completedAt`
- `cancelledAt`

Supported statuses:

- `ACTIVE`
- `COMPLETED`
- `CANCELLED`
- `EXPIRED`
- `FAILED`

Initial workflow types:

- `PATROL_CREATE`
- `PATROL_AAR`
- `AAR_SCREENSHOT_UPLOAD`
- `DEPLOYMENT_PUBLISH`
- `RESOURCE_UPLOAD`
- `APPROVAL_FLOW`

Workflow and status values are enforced by TypeScript constants so future workflows can be added without MariaDB enum churn.

## Service Contract

The service layer lives under:

```text
src/server/discord/interactions/sessions/
```

Primary methods:

- `createSession`
- `getSession`
- `findActiveSessionForUser`
- `updateSessionStep`
- `updateSessionPayload`
- `completeSession`
- `cancelSession`
- `expireOldSessions`
- `failSession`

Discord handler helper methods:

- `startInteractionSession`
- `requireActiveSession`
- `continueInteractionSession`
- `completeInteractionSession`
- `cancelInteractionSession`

Handlers should call these helpers instead of writing directly to Prisma.

## Expiration

Sessions expire after `DISCORD_INTERACTION_SESSION_TTL_MINUTES`.

Default:

```text
15 minutes
```

Expired sessions must not complete portal actions. Handlers should require an active session before performing a mutating operation.

Cleanup is service-level for now through `expireOldSessions`. A scheduled cleanup job can call this later.

## Current Integration

The existing interaction webhook is still the entry point:

```text
POST /api/discord/interactions
```

Current modal-backed commands create short-lived sessions:

- `/aar`
- `/patrol aar`
- `/patrol create`

The session id is embedded in the Discord modal `custom_id`. Older modal ids without a session id are still accepted for compatibility.

## Screenshot Upload Continuation

Discord modals cannot upload files. For Patrol AARs, the modal submit stores text payload and marks the session as waiting for a future `AAR_SCREENSHOT_UPLOAD` continuation.

Future Epic 3 flow:

```text
/patrol aar
  -> AAR modal opens
  -> text fields are submitted
  -> portal creates pending AAR text state
  -> session stores pending screenshot context
  -> member runs /patrol screenshot image:<file>
  -> slash-command attachment handler resolves active session or pending AAR
  -> portal attaches screenshot
  -> session completes
```

Do not treat Discord attachments as authoritative. They must be validated, linked to portal identity, and stored through portal services.

## Audit Behavior

Session lifecycle events are audited:

- `discord.interaction_session.created`
- `discord.interaction_session.completed`
- `discord.interaction_session.cancelled`
- `discord.interaction_session.expired`
- `discord.interaction_session.failed`

Avoid adding noisy per-keystroke or per-render logs. Audit lifecycle transitions and sensitive outcomes.

## Admin Diagnostics

Administration -> Discord shows a compact interaction-session diagnostic card:

- active sessions
- expired sessions
- failed sessions
- configured TTL
- recent failed sessions

These diagnostics help debug modal and future upload workflows without exposing Discord secrets.

## Future Uses

Planned consumers:

- patrol creation confirmation
- patrol AAR screenshot upload continuation through `/patrol screenshot`
- deployment publish confirmation
- deployment resource upload continuation
- document/resource upload workflows
- approval or denial button workflows
- staff review confirmations

Every future consumer must resolve portal identity, check portal permissions, call portal services, and audit sensitive transitions.
