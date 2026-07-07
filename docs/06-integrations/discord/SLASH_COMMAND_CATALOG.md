# Discord Slash Command Catalog

## 1. Purpose

This document defines planned slash commands for the Spearhead C2 Bot.

Commands should be simple, useful, and permission-aware.

## 2. MVP Commands

## /help

### Purpose

Show available bot commands.

### Permissions

Available to all linked members.

### Response

Ephemeral.

---

## /profile

### Purpose

Show a short profile summary.

### Options

- `member`, optional

### Behavior

If no member is provided, show the caller's profile.

If a member is provided, check whether the caller has permission to view that profile.

### Permissions

- own profile: linked user
- other profile: `personnel.profile.view`

### Response

Ephemeral by default.

---

## /quals

### Purpose

Show qualification summary.

### Options

- `member`, optional
- `category`, optional

### Permissions

- own qualifications: linked user
- other member: `qualifications.record.view`

### Response

Ephemeral.

---

## /events

### Purpose

Show upcoming events.

### Options

- `unit`, optional
- `campaign`, optional

### Permissions

- `events.view`

### Response

Ephemeral.

---

## /rsvp

### Purpose

RSVP to an event.

### Options

- `event`
- `status`: yes/no/maybe

### Permissions

- linked member
- event visible to member

### Response

Ephemeral confirmation.

---

## /myunit

### Purpose

Show current unit summary for the caller.

### Permissions

Linked member.

### Response

Ephemeral.

---

## /aar

### Purpose

Open a Discord modal for Patrol AAR report submission.

### Fields

Discord modals are limited to five input rows, so fields are grouped while preserving the Spearhead Patrol AAR report categories:

- Patrol/event and patrol leader
- Tasking
- Callsigns
- Casualty report using FKIA, FWIA, FMIA, and EKIA labels
- Report

### Permissions

- `aars.submit`
- `s3.aars.submit`

### Behavior

The handler resolves the linked Portal user, checks Portal permissions, calls the Portal AAR service, creates a Portal AAR record in pending-map state, updates the linked patrol AAR state, audits the submission, and notifies S3.

Discord modal submit cannot include the map screenshot. The ephemeral response must instruct the submitter to upload the required PNG, JPG, JPEG, or WEBP map screenshot with `/patrol screenshot image:<file>` before S3 can mark the AAR reviewed.

### Response

Ephemeral confirmation or permission/linking error.

---

## /patrol

### Purpose

Manage lightweight patrols from Discord while keeping the portal authoritative.

### Subcommands

- `/patrol create`
- `/patrol list`
- `/patrol info`
- `/patrol end`
- `/patrol aar`
- `/patrol screenshot`

### Permissions

- view/list/info: `patrols.view` or `events.view`
- create: `patrols.create`, `patrols.lead`, or `discord.patrols.create`
- end: `patrols.complete`, `patrols.lead`, or `discord.patrols.manage`
- AAR: `aars.submit` or `s3.aars.submit`
- screenshot upload: AAR submitter, Patrol Leader with `patrols.lead`, or a user with AAR submit permissions

### Behavior

`/patrol create` opens a modal for Patrol Name, Patrol Type, Estimated Duration, and Description. The portal defaults the current Deployment and operational week, creates a Running patrol, posts to the mapped patrol planning channel when available, and returns an ephemeral portal link.

`/patrol list` returns active patrols and patrols awaiting AAR.

`/patrol info` returns a concise patrol summary.

`/patrol end` completes a running patrol and moves it to Awaiting AAR.

`/patrol aar` opens the Patrol AAR modal. The modal creates the AAR text record and pending screenshot state; a map screenshot is still required before review.

`/patrol screenshot image:<file>` uploads the required map screenshot for the caller's pending Discord AAR. This is the webhook-safe continuation path because ordinary channel image messages require gateway event handling, which is intentionally not part of this phase.

### Response

Ephemeral by default. Patrol announcements are public only through mapped patrol channels.

## 3. Staff Commands Later

## /attendance

Staff command for attendance management.

Required permission:

```text
attendance.record
```

## /announce

Post a portal-tracked announcement.

Required permission:

```text
notifications.send
```

## /syncroles

Run Discord role sync.

Required permission:

```text
discord.sync.run
```

## /member

Staff lookup command.

Required permission:

```text
personnel.profile.view
```

## 4. Command Rules

- Commands must check portal permissions.
- Commands should prefer ephemeral responses for personal data.
- Public responses should be used only for announcements or event posts.
- Sensitive details should never be posted publicly.
- Every failed permission check should return a polite ephemeral denial.
