# Discord Patrol Workflow

## Purpose

Discord is the primary operational interface for Patrol Leaders. The portal remains the authoritative system of record for Patrol events, interested members, confirmed participants, AARs, attachments, notifications, activity, and audit logs.

This workflow stays webhook-first. No Discord gateway worker is required.

## Commands

```text
/patrol create
/patrol list
/patrol info
/patrol end
/patrol aar
/patrol screenshot
```

`/patrol screenshot` is the webhook-safe screenshot continuation path. Discord interaction webhooks do not receive ordinary “next image message” events, so required map screenshots are uploaded as slash-command attachment options.

## Flow: Create Patrol

```text
/patrol create
  -> portal creates PATROL_CREATE interaction session
  -> Discord opens Start Patrol modal
  -> user enters patrol name, type, duration, optional description
  -> portal resolves linked Discord identity
  -> portal checks patrol permissions
  -> portal creates Event with eventType=patrol and patrolStatus=running
  -> portal posts mapped patrol announcement
  -> portal audits patrol.started and discord.patrol.created
  -> Discord returns ephemeral confirmation with View Patrol action
```

Deployment and week are inferred from the current active or planning Deployment and current week.

## Patrol Announcement

The patrol announcement is posted to the mapped `patrols` channel.

It includes:

- patrol name
- deployment
- week
- leader
- patrol type
- start time
- estimated duration
- description

Buttons:

- Interested
- View Patrol
- Join Voice when a voice URL is configured later

Interested is only an intent signal. It is not attendance and does not create final attendance records.

## Interested Toggle

Clicking Interested:

- creates a `PatrolRsvp` record when none exists
- removes the user’s existing interest when clicked again
- audits `discord.patrol_interest.added` or `discord.patrol_interest.removed`
- never changes final attendance

Patrol leaders can later convert interested members into confirmed participants through portal participant management.

## Flow: List And Info

`/patrol list` returns active patrols and patrols awaiting AAR.

`/patrol info patrol:<id-or-callsign>` returns:

- patrol name
- leader
- deployment
- week
- type
- start time
- estimated duration
- status
- interested count
- confirmed participants
- AAR status

Info responses include buttons:

- View Portal
- End Patrol
- Submit AAR

Permission checks still happen in portal services.

## Flow: End Patrol

```text
/patrol end
  -> portal resolves linked user
  -> portal finds the leader's running patrol or supplied patrol
  -> portal checks patrols.complete, patrols.lead, or discord.patrols.manage
  -> portal sets endedAt and patrolStatus=awaiting-aar
  -> portal audits patrol.completed and discord.patrol.completed
  -> Discord returns Submit AAR button
```

The End Patrol button from `/patrol info` uses the same service path.

## Flow: Patrol AAR

```text
/patrol aar
  -> portal creates PATROL_AAR interaction session
  -> Discord opens AAR modal
  -> user submits tasking, callsigns, FKIA, FWIA, FMIA, EKIA, report
  -> portal creates AAR in pending-map state
  -> portal creates PendingDiscordAarSubmission
  -> portal creates AAR_SCREENSHOT_UPLOAD session
  -> Discord asks for /patrol screenshot image:<file>
```

The AAR modal uses Spearhead operational wording:

- Tasking
- Callsigns
- FKIA
- FWIA
- FMIA
- EKIA
- Report

Reports should use grid coordinates, be concise, and read as operational reports rather than stories.

## Screenshot Continuation

```text
/patrol screenshot image:<file>
  -> portal resolves linked user
  -> portal finds pending AAR screenshot state for that Discord user
  -> portal downloads the Discord attachment
  -> portal validates PNG, JPG, JPEG, or WEBP
  -> portal stores the file through AAR attachment storage
  -> portal marks the AAR submitted and patrolStatus=aar-submitted
  -> portal completes pending Discord screenshot state
  -> portal notifies S3
  -> portal audits aar.map_screenshot_uploaded and discord.aar_screenshot_uploaded
```

Unsupported files are rejected with an ephemeral error.

The AAR stays `pending-map` until this continuation succeeds. S3 cannot mark the AAR reviewed until the required screenshot exists.

## Portal Synchronization

Discord-created data must be written to portal records:

- `Event` for Patrol
- `PatrolRsvp` for Interested
- `PatrolParticipant` for confirmed participants later
- `Aar`
- `AarAttachment`
- `PendingDiscordAarSubmission`
- `DiscordInteractionSession`
- `Notification`
- `NotificationDelivery`
- `AuditLog`

No Discord-only Patrol data is authoritative.

## Permissions

Required permission families:

- `patrols.view`
- `events.view`
- `patrols.create`
- `patrols.lead`
- `patrols.complete`
- `patrols.rsvp`
- `patrols.aar.submit`
- `aars.submit`
- `s3.aars.submit`
- `discord.patrols.create`
- `discord.patrols.manage`

Never authorize by Discord role alone and never authorize by portal role name.

## Failure Handling

Friendly ephemeral errors are returned for:

- unlinked Discord account
- missing portal profile
- missing permission
- no active Deployment/default week
- no matching Patrol
- no pending AAR screenshot
- unsupported screenshot file type
- expired interaction session
- Discord attachment download failure
- portal service failure

Discord delivery failures do not roll back portal state.
