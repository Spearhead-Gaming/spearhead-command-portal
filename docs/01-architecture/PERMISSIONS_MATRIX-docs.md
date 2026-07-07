# Permissions Architecture and Matrix

## 1. Purpose

This document defines the permission architecture for the Spearhead Command Portal.

The system should use **system-defined permissions** and **admin-created roles**.

Permissions are reusable capabilities. Roles are collections of permissions created and assigned by administrators.

## 2. Core Rule

> Permissions are system-defined. Roles are admin-created.

Application code checks permissions, not role names.

Bad:

```ts
if (user.role === "S1 Staff") {
  allowEditProfile()
}
```

Good:

```ts
if (can(user, "personnel.profile.edit")) {
  allowEditProfile()
}
```

## 3. Unit-Scoped Roles

Some roles should apply only within a unit.

Example:

A user may have the role `Unit Leadership` scoped to `Reaper`.

That user can manage Reaper roster data, but not Misfit or Gambler.

## 4. Permission Naming Standard

Use this pattern:

```text
module.resource.action
```

Examples:

```text
personnel.profile.view
personnel.profile.edit
roster.member.assign_unit
qualifications.record.award
events.event.publish
```

## 5. MVP Permission Catalog

### Core
```text
core.dashboard.view
core.search.use
core.notifications.view
```

### Personnel
```text
personnel.profile.view
personnel.profile.create
personnel.profile.edit
personnel.profile.archive
personnel.profile.status_change
personnel.profile.service_record.view
personnel.profile.service_record.edit
personnel.profile.notes.view
personnel.profile.notes.create
personnel.profile.notes.edit
personnel.profile.notes.delete
personnel.profile.logs.view
```

### Roster
```text
roster.member.view
roster.member.create
roster.member.edit
roster.member.archive
roster.rank.change
roster.unit.assign
roster.position.assign
roster.status.change
roster.transfer.request
roster.transfer.approve
roster.transfer.reject
roster.bulk_update
```

### Units
```text
units.view
units.create
units.edit
units.archive
units.hierarchy.manage
units.positions.view
units.positions.create
units.positions.edit
units.positions.archive
units.slots.view
units.slots.manage
units.dashboard.view
```

### Qualifications
```text
qualifications.view
qualifications.create
qualifications.edit
qualifications.archive
qualifications.categories.manage
qualifications.record.view
qualifications.record.award
qualifications.record.revoke
qualifications.record.edit
qualifications.matrix.view
qualifications.requirements.view
qualifications.requirements.manage
qualifications.signoff.manage
```

### Events
```text
events.view
events.create
events.edit
events.delete
events.publish
events.cancel
events.archive
events.calendar.view
```

### Attendance
```text
attendance.view
attendance.rsvp.view
attendance.rsvp.manage
attendance.record
attendance.edit
attendance.override
attendance.lock
attendance.reports.view
```

### Campaigns
```text
campaigns.view
campaigns.create
campaigns.edit
campaigns.publish
campaigns.archive
campaigns.timeline.manage
campaigns.statistics.view
campaigns.documents.manage
```

### S3 Operations
```text
s3.dashboard.view
s3.missions.view
s3.missions.create
s3.missions.edit
s3.missions.review
s3.missions.approve
s3.missions.reject
s3.missions.publish
s3.missions.archive
s3.conops.view
s3.conops.create
s3.conops.edit
s3.conops.publish
s3.aars.view
s3.aars.submit
s3.aars.review
```

### Documents
```text
documents.view
documents.create
documents.edit
documents.archive
documents.publish
documents.restrict
documents.categories.manage
```

### Notifications
```text
notifications.view
notifications.send
notifications.templates.manage
notifications.delivery.view
notifications.delivery.retry
```

### Discord
```text
discord.view
discord.manage
discord.servers.manage
discord.channels.manage
discord.roles.manage
discord.notifications.send
discord.sync.run
discord.sync.view
discord.bot.health.view
```

### Administration
```text
admin.dashboard.view
admin.users.view
admin.users.manage
admin.roles.view
admin.roles.create
admin.roles.edit
admin.roles.delete
admin.permissions.view
admin.permissions.assign
admin.settings.view
admin.settings.manage
```

### Audit
```text
audit.view
audit.export
```

## 6. Admin Role Builder Requirements

The role management UI should allow admins to:

1. Create a role
2. Name the role
3. Add a description
4. Select permissions grouped by module
5. Optionally mark the role as unit-scoped when assigning it
6. Assign the role to users
7. View effective permissions for a user
8. Remove role assignments
9. Disable roles
10. Audit role changes

## 7. Effective Permission Evaluation

A user's effective permissions come from:

- all active roles assigned to the user
- all permissions attached to those roles
- unit scope on role assignments
- optional expiration dates on role assignments

Evaluation should answer:

```text
Does this user have this permission for this resource?
```

## 8. Permission Checking Rules

- Always check permissions server-side.
- UI permission checks are only for hiding/showing controls.
- API routes must enforce permissions independently.
- Discord commands must enforce permissions independently.
- Unit-scoped permissions must be checked against resource ownership.
- Audit all permission and role changes.
