# Seed Data Strategy

## Purpose

Seed data should create the initial Spearhead environment after database migration.

Seed data must be repeatable and safe to run more than once.

## Principles

- Use stable keys/slugs where practical.
- Do not create duplicates on repeated runs.
- Seed required system records before optional records.
- Keep Spearhead-specific seed data in clearly named sections.
- Do not hard-code seed data into UI components.

## Required Seed Groups

## 1. Profile Statuses

- Applicant
- Recruit
- Active
- Reserve
- LOA
- Inactive
- Retired
- Discharged
- Banned

## 2. Spearhead Units

- Spearhead Command — Spearhead
- 3rd Infantry Division — Reaper
- 75th Ranger Regiment — Misfit
- 1st Air Cavalry Brigade — Gambler
- Detachment-7 — Viking

## 3. Attendance Statuses

RSVP:

- Yes
- No
- Maybe

Final:

- Present
- Absent
- Excused
- Late
- LOA

## 4. Campaign Statuses

- Planning
- Active
- Paused
- Completed
- Archived

## 5. Qualification Categories

- Basic Infantry
- Leadership
- Medical
- Communications
- Aviation
- Reconnaissance
- Mission Maker
- Zeus
- Staff
- Unit-Specific

## 6. Permissions

Seed permissions by module.

### Personnel

- personnel.view
- personnel.edit
- profile.notes.view
- profile.notes.manage

### Roster

- roster.view
- roster.manage
- rank.change
- unit.assign
- position.assign
- status.change

### Qualifications

- qualifications.view
- qualifications.manage
- qualifications.award
- qualifications.revoke
- qualifications.matrix.view

### Events and Attendance

- events.view
- events.create
- events.edit
- attendance.view
- attendance.record
- attendance.edit
- attendance.lock

### Campaigns and S3

- campaigns.view
- campaigns.create
- campaigns.edit
- campaigns.publish
- s3.dashboard.view
- missions.create
- missions.review
- missions.approve
- missions.publish

### Discord

- discord.view
- discord.manage
- discord.channels.manage
- discord.roles.manage
- discord.discovery.view
- discord.discovery.run
- discord.discovery.cancel
- discord.resources.view
- discord.resources.manage
- discord.reconciliation.view
- discord.reconciliation.manage
- discord.sync.schedule.manage
- discord.mappings.manage
- discord.notifications.send

### Admin

- admin.users.manage
- admin.roles.manage
- admin.permissions.manage
- admin.audit.view
- admin.settings.manage

## 7. Default Roles

### Member

Basic self-service role.

### Instructor

Can award qualifications.

### Squad Leader

Can view squad/unit roster and attendance information.

### Unit Leadership

Can manage assigned unit roster information.

### S1 Staff

Personnel administration.

### S2 Staff

Intel/documents later.

### S3 Staff

Operations/campaign planning.

### S4 Staff

Logistics later.

### Spearhead Command

Cross-unit leadership permissions.

### System Administrator

Full system access.

## 8. Seed Order

Recommended order:

1. Profile statuses
2. Units
3. Ranks
4. Positions, if known
5. Qualification categories
6. Permissions
7. Roles
8. Role permissions
9. Attendance/campaign statuses
10. Default admin user linking, if needed

## 9. Open Seed Data Questions

Before final seed implementation:

- Confirm full rank list
- Confirm rank ordering
- Confirm default positions/billets
- Confirm initial qualification list
- Confirm default admin Discord user
- Confirm Discord server IDs
- Confirm Discord channel IDs
