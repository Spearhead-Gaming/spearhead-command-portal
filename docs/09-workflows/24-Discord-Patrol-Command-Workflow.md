# Discord Patrol Command Workflow

Discord is the fastest interface for patrol leaders, but the portal remains the source of truth.

## Commands

```text
/patrol create
/patrol list
/patrol info
/patrol end
/patrol aar
/patrol screenshot
```

## `/patrol create`

```text
Member runs /patrol create
-> Discord modal opens
-> Member enters name, type, duration, optional description
-> Portal resolves linked user
-> Portal checks patrols.create, patrols.lead, or discord.patrols.create
-> Portal creates Event patrol in Running status
-> Portal posts announcement to mapped patrols channel when available
-> Portal records audit and notification records
-> Discord replies ephemerally with portal link
```

The command defaults Deployment and operational week from current active portal data.

## `/patrol list`

Shows running patrols and patrols awaiting AAR. Response is ephemeral by default.

## `/patrol info`

Shows status, callsign, type, week, start time, estimated duration, and portal link.

## `/patrol end`

```text
Patrol leader runs /patrol end
-> Portal resolves linked user
-> Portal finds the user's running patrol or requested patrol
-> Portal checks patrols.complete, patrols.lead, or discord.patrols.manage
-> Portal records end time
-> Patrol moves to Awaiting AAR
-> Bot prompts the leader to submit /patrol aar
```

If the user leads multiple running patrols, the bot asks for the patrol ID or callsign.

## `/patrol aar`

Discord modals cannot upload files, so the command collects text first.

```text
Member runs /patrol aar
-> Discord modal collects patrol, tasking, callsigns, FKIA, FWIA, FMIA, EKIA, report
-> Portal creates a Patrol AAR in pending-map state
-> Portal creates PendingDiscordAarSubmission
-> Portal creates AAR_SCREENSHOT_UPLOAD interaction session
-> Discord replies asking for /patrol screenshot image:<file>
-> /patrol screenshot uploads the required map screenshot through the interaction webhook
-> Portal attaches screenshot and marks AAR submitted
```

Until the screenshot exists, S3 cannot mark the AAR reviewed.

Webhook-only mode cannot passively wait for ordinary image messages. The screenshot continuation therefore uses a slash-command attachment option rather than gateway message-create handling.

## Announcement Buttons

Patrol announcements include Interested, View Patrol, and Join Voice placeholder when configured.

The Interested button writes `PatrolRsvp` and never writes final attendance.
