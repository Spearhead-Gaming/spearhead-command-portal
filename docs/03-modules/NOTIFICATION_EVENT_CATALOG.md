# Notification Event Catalog

## 1. Purpose

This catalog defines notification events, recipients, delivery channels, and priority.

## 2. Personnel Events

### personnel.rank_changed

Trigger:

- member rank changes

Recipients:

- member
- unit leadership
- S1 staff

Channels:

- portal notification
- Discord DM to member, optional
- Discord staff channel

Priority:

- info

Audit:

- required

---

### personnel.unit_changed

Trigger:

- member unit assignment changes

Recipients:

- member
- previous unit leadership
- receiving unit leadership
- S1 staff

Channels:

- portal notification
- Discord staff channels
- Discord DM to member

Priority:

- action/info

Audit:

- required

---

### personnel.status_changed

Trigger:

- member status changes

Recipients:

- member
- unit leadership
- S1 staff

Channels:

- portal notification
- Discord staff channel

Priority:

- info/warning depending on status

Audit:

- required

## 3. Qualification Events

### qualification.awarded

Trigger:

- qualification is awarded

Recipients:

- member
- awarding instructor
- unit leadership if required qualification

Channels:

- portal notification
- Discord DM to member
- Discord qualification-alerts channel, optional

Priority:

- info

Audit:

- required

---

### qualification.revoked

Trigger:

- qualification is revoked

Recipients:

- member
- unit leadership
- S1 or training staff

Channels:

- portal notification
- Discord DM to member, optional
- staff channel

Priority:

- warning

Audit:

- required

---

### qualification.expiring

Trigger:

- qualification is near expiration

Recipients:

- member
- unit leadership if required

Channels:

- portal notification
- Discord DM

Priority:

- warning

Audit:

- not required unless staff action is taken

## 4. Event and Attendance Events

### event.published

Trigger:

- event is published

Recipients:

- participating units
- members required to RSVP

Channels:

- Discord event/attendance channel
- portal notification

Priority:

- action required

Audit:

- required

---

### event.reminder

Trigger:

- scheduled reminder before event

Recipients:

- members who have not RSVP'd
- optionally all participating members

Channels:

- Discord DM or attendance channel
- portal notification

Priority:

- action required

Audit:

- delivery log only

---

### attendance.finalized

Trigger:

- attendance is locked/finalized

Recipients:

- unit leadership
- S3 staff
- members optionally

Channels:

- portal notification
- Discord staff channel

Priority:

- info

Audit:

- required

## 5. Campaign and S3 Events

### campaign.published

Trigger:

- campaign is published

Recipients:

- participating units
- S3 staff

Channels:

- Discord announcements/events channel
- portal notification

Priority:

- info

Audit:

- required

---

### s3.mission_review_requested

Trigger:

- mission submitted for review

Recipients:

- S3 reviewers

Channels:

- portal notification
- Discord staff-alerts channel

Priority:

- action required

Audit:

- required

---

### s3.conop_published

Trigger:

- CONOP is published

Recipients:

- participating units
- event attendees

Channels:

- Discord conops channel
- portal notification

Priority:

- action required

Audit:

- required

---

### s3.aar_missing

Trigger:

- completed event has no AAR after configured time

Recipients:

- S3 staff
- mission maker

Channels:

- portal notification
- Discord staff-alerts channel

Priority:

- warning

Audit:

- delivery log only

---

### patrol.aar_missing_screenshot

Trigger:

- Patrol AAR text exists but the required map screenshot is missing

Recipients:

- patrol leader
- S3 staff
- operation creator where available

Channels:

- portal notification
- Discord staff-alerts channel when mapped

Priority:

- action required

Audit:

- screenshot upload is audited

---

### patrol.aar_reviewed

Trigger:

- S3 saves a Patrol AAR review decision

Recipients:

- patrol leader
- S3 staff
- operation creator where available

Channels:

- portal notification
- Discord staff-alerts channel when mapped

Priority:

- info

Audit:

- required

---

### deployment.progression_recommended

Trigger:

- Patrol AAR review records guidance for the next Deployment week/path

Recipients:

- S3 staff
- deployment creator
- unit leadership where scoped

Channels:

- portal notification
- Discord staff-alerts channel when mapped

Priority:

- action required

Audit:

- required

---

### operations.readiness.blocked

Trigger:

- Operations Package readiness evaluation has blocking issues

Recipients:

- S3 staff
- deployment creator

Channels:

- portal notification placeholder
- Discord staff-alerts placeholder when mapped

Priority:

- warning

Audit:

- not required unless a staff action changes package state

---

### operations.readiness.ready

Trigger:

- Operations Package readiness evaluation has no blocking issues

Recipients:

- S3 staff
- deployment creator

Channels:

- portal notification placeholder

Priority:

- info

Audit:

- not required unless a staff action changes package state

---

### operations.publication.blocked

Trigger:

- Publication readiness has blocking issues

Recipients:

- S3 staff
- deployment publisher

Channels:

- portal notification placeholder
- Discord staff-alerts placeholder when mapped

Priority:

- warning

Audit:

- not required unless a staff action changes package state

---

### operations.package.ready_for_review

Trigger:

- Operations Package is marked ready for review in a future workflow

Recipients:

- S3 reviewers
- deployment creator

Channels:

- portal notification placeholder
- Discord staff-alerts placeholder when mapped

Priority:

- action required

Audit:

- required when implemented

---

### operations.release.published

Trigger:

- Operations Package is published as an Operations Release

Recipients:

- community
- S3 staff
- deployment creator
- assigned Zeus

Channels:

- Discord events channel
- portal notification

Priority:

- action required

Audit:

- required

---

### operations.release.amendment_published

Trigger:

- Operations Package amendment is published

Recipients:

- community
- S3 staff
- deployment creator
- assigned Zeus

Channels:

- Discord events channel
- portal notification

Priority:

- action required

Audit:

- required

---

### operations.release.publication_failed

Trigger:

- Operations Release Discord publication fails

Recipients:

- S3 staff
- Discord manager
- deployment creator

Channels:

- portal notification
- Discord staff-alerts placeholder when available

Priority:

- warning

Audit:

- required

## 6. Discord/System Events

### discord.delivery_failed

Trigger:

- Discord notification fails after retries

Recipients:

- Discord manager
- system administrator

Channels:

- portal notification
- Discord admin-alerts if possible

Priority:

- warning/critical

Audit:

- required

---

### admin.permission_changed

Trigger:

- role or permission assignment changes

Recipients:

- system administrator
- affected user optionally

Channels:

- portal notification

Priority:

- info/warning

Audit:

- required
