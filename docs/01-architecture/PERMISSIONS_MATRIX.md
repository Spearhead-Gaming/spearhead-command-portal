# Permissions Architecture and Matrix

## 1. Purpose

This document defines the permission architecture for the Spearhead Command Portal.

The system should use **system-defined permissions** and **admin-created roles**.

Permissions are reusable capabilities. Roles are collections of permissions created and assigned by administrators.

## 2. Core Rule

> Permissions are system-defined. Roles are admin-created.

This means application code checks permissions, not role names.

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

## 3. Why This Matters

Spearhead leadership should be able to create roles without developer involvement.

Examples:

- Reaper Platoon Staff
- Misfit Cadre
- Gambler Instructor
- Viking Leadership
- S3 Mission Maker
- S1 Assistant
- Temporary Event Staff

Each role can be built from reusable permissions.

## 4. Permission Model

### Permission

A permission represents one capability.

Example:

```text
personnel.profile.edit
```

Recommended fields:

- id
- key
- label
- description
- module
- category
- isSystem

### Role

A role is a named collection of permissions.

Recommended fields:

- id
- name
- label
- description
- isSystem
- isActive

### RolePermission

Join table between roles and permissions.

Recommended fields:

- id
- roleId
- permissionId

### UserRole

Assigns a role to a user.

Recommended fields:

- id
- userId
- roleId
- unitId, optional
- startsAt, optional
- endsAt, optional

## 5. Unit-Scoped Roles

Some roles should apply only within a unit.

Example:

A user may have the role `Unit Leadership` scoped to `Reaper`.

That user can manage Reaper roster data, but not Misfit or Gambler.

### Unit Scope Rule

If a permission-bearing role has a `unitId`, the permission applies only to resources inside that unit unless the permission is explicitly global.

Examples:

- `roster.member.edit` with `unitId = Reaper` means edit Reaper members.
- `admin.users.manage` should usually be global only.
- `s3.missions.publish` may be global or unit-scoped depending on assignment.

## 6. Permission Naming Standard

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

## 7. Recommended Actions

Use consistent action names:

- view
- create
- edit
- delete
- archive
- manage
- approve
- reject
- publish
- lock
- assign
- revoke
- export
- configure

## 8. Permission Categories

Recommended modules:

- core
- forms
- personnel
- roster
- units
- qualifications
- events
- attendance
- campaigns
- s3
- documents
- notifications
- discord
- admin
- audit

## 9. MVP Permission Catalog

## 9.1 Core

```text
core.dashboard.view
core.search.use
core.notifications.view
rules.view
rules.evaluate
recommendations.view
recommendations.manage
operations.command.view
operations.command.manage
```

## 9.2 Personnel

```text
personnel.dashboard.view
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
personnel.profile.notes.manage
personnel.profile.logs.view
personnel.timeline.view
personnel.actions.view
personnel.actions.manage
```

## 9.3 Forms and Workflow

```text
forms.view
forms.create
forms.edit
forms.archive
forms.submit
forms.review
forms.approve
forms.deny
forms.comment
forms.assign_reviewer
forms.admin
```

## 9.4 Roster

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

## 9.5 Units

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
units.manage
units.assignments.manage
units.positions.manage
units.readiness.view
units.requirements.manage
```

## 9.6 Qualifications

```text
qualifications.view
qualifications.create
qualifications.edit
qualifications.manage
qualifications.archive
qualifications.categories.manage
qualifications.record.view
qualifications.record.award
qualifications.record.revoke
qualifications.record.edit
qualifications.records.view
qualifications.records.award
qualifications.records.revoke
qualifications.matrix.view
qualifications.requirements.view
qualifications.requirements.manage
qualifications.signoff.manage
```

## 9.7 Events

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

## 9.8 Attendance

```text
attendance.view
attendance.manage
attendance.rsvp.view
attendance.rsvp.manage
attendance.record
attendance.edit
attendance.override
attendance.lock
attendance.reports.view
attendance.policies.manage
```

## 9.8.1 Personnel Readiness

```text
readiness.member.view
readiness.unit.view
transfers.view
transfers.submit
transfers.review
loa.view
loa.submit
loa.review
```

## 9.9 Campaigns

```text
campaigns.view
campaigns.create
campaigns.edit
campaigns.publish
campaigns.archive
campaigns.timeline.manage
campaigns.statistics.view
campaigns.documents.manage
deployments.create
deployments.edit
deployments.publish
deployments.resources.view
deployments.resources.upload
deployments.resources.edit
deployments.resources.delete
deployments.progression.view
deployments.progression.manage
```

## 9.10 S3 Operations

```text
operations.center.view
operations.package.view
operations.package.edit
operations.package.review
operations.package.approve
operations.package.publish
operations.planning.view
operations.planning.edit
operations.readiness.view
operations.readiness.evaluate
operations.health.view
operations.health.manage
operations.dashboard.customize
operations.recommendations.view
operations.command.view
operations.command.manage
operations.release.view
operations.release.publish
operations.release.history
operations.tasking.view
operations.tasking.manage
operations.resources.manage
operations.zeus.assign
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

## 9.11 Dashboard Widgets

```text
dashboard.widgets.manage
```

## 9.11 Patrols

```text
patrols.view
patrols.create
patrols.lead
patrols.complete
patrols.participants.manage
patrols.rsvp
patrols.aar.submit
patrols.aar.review
patrols.archive
aars.submit
aars.review
aars.attachments.manage
```

## 9.12 Documents

```text
documents.view
documents.create
documents.edit
documents.archive
documents.publish
documents.restrict
documents.categories.manage
```

## 9.13 Notifications

```text
notifications.view
notifications.send
notifications.manage
notifications.templates.manage
notifications.delivery.view
notifications.delivery.retry
```

## 9.14 Communications

```text
communications.view
communications.manage
communications.send
communications.retry
communications.history.view
communications.templates.manage
communications.preferences.manage
announcements.view
announcements.manage
announcements.send
```

## 9.15 Community Management

```text
community.view
community.manage
community.dashboard.view
cases.view
cases.create
cases.edit
cases.assign
cases.transition
cases.close
cases.reopen
cases.archive
cases.restricted.view
cases.command.view
evidence.view
evidence.manage
notes.view
notes.manage
incidents.view
incidents.create
incidents.manage
appeals.view
appeals.submit
appeals.review
moderation.view
moderation.warn
moderation.kick
moderation.timeout
moderation.ban
moderation.reverse
moderation.history.view
```

## 9.16 Discord

```text
discord.view
discord.manage
discord.servers.manage
discord.channels.manage
discord.roles.manage
discord.discovery.view
discord.discovery.run
discord.discovery.cancel
discord.resources.view
discord.resources.manage
discord.reconciliation.view
discord.reconciliation.manage
discord.sync.schedule.manage
discord.mappings.manage
discord.members.view
discord.members.sync
discord.identity.view
discord.identity.merge
discord.notifications.send
discord.patrols.create
discord.patrols.manage
discord.sync.run
discord.sync.view
discord.moderation.view
discord.moderation.warn
discord.moderation.timeout
discord.moderation.kick
discord.moderation.ban
discord.moderation.appeals
discord.moderation.policy.manage
discord.moderation.case.manage
discord.moderation.history.view
discord.bot.health.view
admin.discord.manage
```

## 9.17 Administration

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

## 9.18 Audit

```text
audit.view
audit.export
```

## 10. Suggested Default Role Presets

Although roles should be admin-created, the system should seed helpful starter roles.

These are presets, not hard-coded logic.

## 10.1 Member

Suggested permissions:

```text
core.dashboard.view
core.search.use
core.notifications.view
personnel.profile.view
personnel.profile.service_record.view
roster.member.view
units.view
units.dashboard.view
qualifications.view
qualifications.record.view
events.view
events.calendar.view
attendance.rsvp.view
campaigns.view
documents.view
forms.view
forms.submit
forms.comment
```

## 10.2 Instructor

Includes Member permissions plus:

```text
qualifications.record.award
qualifications.record.edit
qualifications.signoff.manage
attendance.view
events.view
```

## 10.3 Unit Leadership

Includes Member permissions plus unit-scoped:

```text
personnel.profile.view
roster.member.edit
roster.rank.change
roster.position.assign
roster.status.change
units.dashboard.view
units.positions.view
units.slots.manage
qualifications.matrix.view
qualifications.requirements.view
attendance.view
attendance.record
attendance.edit
attendance.reports.view
campaigns.statistics.view
forms.view
forms.review
forms.approve
forms.deny
forms.comment
forms.assign_reviewer
```

## 10.4 S1 Staff

Personnel-focused permissions:

```text
personnel.profile.view
personnel.profile.create
personnel.profile.edit
personnel.profile.status_change
personnel.profile.service_record.view
personnel.profile.service_record.edit
personnel.profile.notes.view
personnel.profile.notes.create
personnel.profile.logs.view
forms.view
forms.create
forms.edit
forms.archive
forms.review
forms.approve
forms.deny
forms.comment
forms.assign_reviewer
roster.member.view
roster.member.create
roster.member.edit
roster.rank.change
roster.unit.assign
roster.position.assign
roster.status.change
roster.transfer.approve
roster.transfer.reject
roster.bulk_update
audit.view
```

## 10.5 S3 Staff

Operations-focused permissions:

```text
s3.dashboard.view
s3.missions.view
s3.missions.create
s3.missions.edit
s3.missions.review
s3.missions.approve
s3.missions.publish
s3.conops.view
s3.conops.create
s3.conops.edit
s3.conops.publish
s3.aars.view
s3.aars.review
events.view
events.create
events.edit
events.publish
campaigns.view
campaigns.create
campaigns.edit
campaigns.publish
attendance.view
attendance.reports.view
forms.view
forms.review
forms.comment
```

## 10.6 Discord Manager

Discord-focused permissions:

```text
discord.view
discord.manage
discord.servers.manage
discord.channels.manage
discord.roles.manage
discord.discovery.view
discord.discovery.run
discord.discovery.cancel
discord.resources.view
discord.resources.manage
discord.reconciliation.view
discord.reconciliation.manage
discord.sync.schedule.manage
discord.mappings.manage
discord.members.view
discord.members.sync
discord.identity.view
discord.identity.merge
discord.notifications.send
discord.sync.run
discord.sync.view
discord.moderation.view
discord.moderation.warn
discord.moderation.timeout
discord.moderation.kick
discord.moderation.ban
discord.moderation.appeals
discord.moderation.policy.manage
discord.moderation.case.manage
discord.moderation.history.view
discord.bot.health.view
notifications.view
notifications.send
notifications.delivery.view
```

## 10.7 System Administrator

Full system access.

The application may treat this as all permissions, but it should still be represented through role assignment.

## 11. Admin Role Builder Requirements

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

## 12. Effective Permission Evaluation

A user's effective permissions come from:

- all active roles assigned to the user
- all permissions attached to those roles
- unit scope on role assignments
- optional expiration dates on role assignments

Evaluation should answer:

```text
Does this user have this permission for this resource?
```

Examples:

```text
Can user edit member profile globally?
Can user edit member profile in Reaper?
Can user publish this campaign?
Can user manage Discord channels for this unit?
```

## 13. Permission Checking Rules

- Always check permissions server-side.
- UI permission checks are only for hiding/showing controls.
- API routes must enforce permissions independently.
- Discord commands must enforce permissions independently.
- Unit-scoped permissions must be checked against resource ownership.
- Audit all permission and role changes.

## 14. Discord Permission Usage

Discord interactions should check portal permissions.

Examples:

- A Discord button for approving attendance requires `attendance.edit`.
- A Discord command to publish an announcement requires `notifications.send`.
- A Discord command to inspect a roster may require `roster.member.view`.

## 15. Audit Requirements

Audit these actions:

- role created
- role edited
- role disabled
- role deleted
- permission assigned to role
- permission removed from role
- role assigned to user
- role removed from user
- unit scope changed
- permission check failure for sensitive actions, optional

## 16. MVP Recommendation

For MVP, implement:

- Permission model
- Role model
- RolePermission join
- UserRole join
- Seeded permission catalog
- Seeded default role presets
- Server-side `can()` helper
- Unit-scoped role support
- Basic role management UI placeholder

Full drag-and-drop role builder can come later.

## 17. Open Questions

Before implementation:

- Should Unit Leadership roles always be unit-scoped?
- Should Spearhead Command have global access by default?
- Should staff roles expire automatically for temporary assignments?
- Should private profile notes require a separate high-sensitivity permission?
- Should Discord Manager be separate from System Administrator?
