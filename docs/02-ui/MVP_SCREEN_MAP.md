# MVP Screen Map

## 1. Purpose

This document defines the MVP screens Codex should create for the Spearhead Command Portal.

The goal is to provide a clean, usable portal shell with the correct navigation, page responsibilities, layout patterns, permissions, and placeholder states before heavy feature logic is implemented.

## 2. Global Layout

All authenticated pages should use the same application shell.

### Required Layout Regions

- Left sidebar navigation
- Top header bar
- Page title and description
- Primary action area
- Content region
- Optional right-side context panel
- Toast/notification region

### Header Elements

- Global search trigger
- Notifications icon
- Current user menu
- Discord connection indicator, optional
- Mobile menu trigger

## 3. Primary Navigation

```text
Dashboard
Personnel
  Members
  Roster
  Qualifications
Units
  Spearhead Command
  Reaper
  Misfit
  Gambler
  Viking
Applications
Operations
  Events
  Attendance
  Campaigns
  CONOPs
  AARs
Training
  Qualification Matrix
Documents
Administration
  Users
  Roles & Permissions
  Discord Settings
  Audit Logs
  System Settings
```

Navigation items should be permission-aware.

## 4. MVP Screens

## 4.1 Dashboard

### Route

```text
/dashboard
```

### Purpose

Give the current user a role-aware overview of what they need to know and do.

### Core Widgets

- Next Event
- Current Campaign
- My Unit
- My Qualifications
- Attendance Summary
- Recent Announcements
- Pending Tasks
- Quick Links

### Primary Actions

- View next event
- RSVP
- View profile
- View current campaign

### Permissions

```text
core.dashboard.view
```

### Empty State

If no profile exists, show an onboarding card asking the user to connect or request profile setup.

## 4.2 Member Profile

### Route

```text
/personnel/members/[id]
```

### Purpose

Display a member's official service record.

### Sections

- Profile header
- Discord display name, unit, position, status, and optional rank
- Contact/identity details
- Qualification badges
- Attendance summary
- Service timeline
- Campaign participation
- Notes, permission restricted
- Audit/profile logs, permission restricted

### Primary Actions

- Edit profile
- Set optional rank
- Assign unit
- Assign position
- Change status
- Add note
- Award qualification

### Permissions

```text
personnel.profile.view
personnel.profile.edit
roster.rank.change
roster.unit.assign
roster.position.assign
personnel.profile.notes.view
personnel.profile.notes.create
```

## 4.3 Member List

### Route

```text
/personnel/members
```

### Purpose

Search and browse member profiles.

### Table Columns

- Member / Discord Name
- Unit
- Position
- Status
- Join Date
- Discord Linked
- Actions

### Filters

- Unit
- Status
- Qualification
- Discord linked/unlinked

### Primary Actions

- Create member
- Export later
- Open profile

### Permissions

```text
personnel.profile.view
personnel.profile.create
```

## 4.4 Applications Workspace

### Routes

```text
/applications
/applications/[id]
/administration/forms
/administration/forms/[id]
/administration/submissions
```

### Purpose

Provide configurable member-facing applications plus a staff review queue without leaving the authenticated command shell.

### Sections

- Available forms
- My submissions
- Submission inspector drawer
- Form builder
- Review queue
- Comment timeline
- Approval actions

### Primary Actions

- Open form
- Save draft
- Submit application
- Comment on submission
- Assign reviewer
- Request changes
- Approve
- Deny

### Permissions

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

## 4.5 Roster Table

### Route

```text
/personnel/roster
```

### Purpose

Provide a fast roster management view.

### Table Columns

- Member
- Unit
- Position
- Status
- Attendance
- Required Qualifications
- Last Updated
- Actions

### Filters

- Unit
- Rank
- Position
- Status
- Missing qualifications
- LOA/inactive

### Primary Actions

- Set optional rank
- Assign unit
- Assign position
- Change status
- Bulk update

### Permissions

```text
roster.member.view
roster.member.edit
roster.rank.change
roster.unit.assign
roster.position.assign
roster.status.change
roster.bulk_update
```

### Design Requirement

Common roster edits should be possible without navigating through multiple pages.

## 4.6 Unit Dashboard

### Route

```text
/units/[unitId]
```

### Purpose

Give leadership and members a clear view of each unit.

### Sections

- Unit header
- Unit strength
- Leadership
- Roster
- Open billets
- Qualification readiness
- Upcoming events
- Campaign participation
- Unit announcements
- Discord channel links

### Primary Actions

- Edit unit
- Manage positions
- Manage slots
- View roster
- Post announcement, later

### Permissions

```text
units.view
units.dashboard.view
units.edit
units.positions.view
units.slots.manage
```

## 4.7 Qualification Matrix

### Route

```text
/training/qualification-matrix
```

### Purpose

Show qualification readiness across members and units.

### Layout

Rows: members  
Columns: qualifications  
Cells: status indicator

### Filters

- Unit
- Position
- Qualification category
- Missing required
- Expiring soon
- Status

### Primary Actions

- Award qualification
- Revoke qualification
- Edit qualification record
- Manage requirements

### Permissions

```text
qualifications.matrix.view
qualifications.record.award
qualifications.record.revoke
qualifications.requirements.manage
```

## 4.8 Qualifications Catalog

### Route

```text
/personnel/qualifications
```

### Purpose

Manage the catalog of qualifications.

### Sections

- Qualification categories
- Qualification list
- Requirement mapping summary

### Primary Actions

- Create qualification
- Edit qualification
- Archive qualification
- Manage categories

### Permissions

```text
qualifications.view
qualifications.create
qualifications.edit
qualifications.archive
qualifications.categories.manage
```

## 4.9 Events List

### Route

```text
/operations/events
```

### Purpose

Display upcoming and past events.

### Views

- List view
- Calendar view, later

### Table/Card Fields

- Title
- Type
- Date/time
- Host unit
- Campaign
- RSVP status
- Attendance status
- Published status

### Primary Actions

- Create event
- Publish event
- View attendance
- RSVP

### Permissions

```text
events.view
events.create
events.edit
events.publish
attendance.rsvp.view
```

## 4.10 Event Detail and Attendance

### Route

```text
/operations/events/[id]
```

### Purpose

Show event details, RSVP status, attendance, and related campaign/CONOP links.

### Sections

- Event summary
- Date/time
- Participating units
- RSVP panel
- Attendance table
- Related campaign
- Related documents/CONOPs
- Discord post status

### Primary Actions

- RSVP
- Edit event
- Record attendance
- Lock attendance
- Send Discord reminder

### Permissions

```text
events.view
events.edit
attendance.rsvp.manage
attendance.record
attendance.edit
attendance.lock
discord.notifications.send
```

## 4.11 Campaign List

### Route

```text
/operations/campaigns
```

### Purpose

Show active, planned, completed, and archived campaigns.

### Card Fields

- Campaign title
- Status
- Phase
- Participating units
- Next event
- Progress
- Last updated

### Primary Actions

- Create campaign
- Open campaign
- Archive campaign

### Permissions

```text
campaigns.view
campaigns.create
campaigns.archive
```

## 4.12 Campaign Detail

### Route

```text
/operations/campaigns/[id]
```

### Purpose

Present campaign information in an easy-to-read web page.

### Sections

- Campaign header
- Status and current phase
- Overview/story
- Participating units
- Timeline
- Upcoming operation
- Completed operations
- CONOP links
- AAR links
- Attendance stats
- Media/documents placeholder

### Primary Actions

- Edit campaign
- Add event
- Publish update
- Manage timeline

### Permissions

```text
campaigns.view
campaigns.edit
campaigns.publish
campaigns.timeline.manage
campaigns.statistics.view
```

## 4.13 S3 Dashboard

### Route

```text
/operations/s3
```

### Purpose

Provide S3 with mission planning and oversight.

### Widgets

- Active campaigns
- Upcoming missions
- Draft missions
- Missions awaiting review
- CONOPs needing review
- AARs missing
- Mission maker assignments

### Primary Actions

- Create mission
- Review mission
- Open CONOP
- Open AAR queue

### Permissions

```text
s3.dashboard.view
s3.missions.view
s3.missions.create
s3.missions.review
```

## 4.14 Documents

### Route

```text
/documents
```

### Purpose

Centralize documents and guides.

### Sections

- SOPs
- Training guides
- CONOPs
- AARs
- Intel
- Mod guides
- Policies

### Primary Actions

- Create document
- Edit document
- Publish document
- Restrict document

### Permissions

```text
documents.view
documents.create
documents.edit
documents.publish
documents.restrict
```

## 4.15 Admin Users

### Route

```text
/administration/users
```

### Purpose

Manage portal users and profile linking.

### Table Columns

- Name
- Discord ID
- Linked profile
- Active
- Roles
- Last login
- Actions

### Primary Actions

- Link to profile
- Activate/deactivate user
- Assign role

### Permissions

```text
admin.users.view
admin.users.manage
admin.roles.view
```

## 4.16 Roles and Permissions

### Route

```text
/administration/roles
```

### Purpose

Allow admins to create roles and assign system-defined permissions.

### Sections

- Role list
- Role detail
- Permission groups by module
- Assigned users
- Unit-scoped assignments

### Primary Actions

- Create role
- Edit role
- Assign permissions
- Assign role to user
- View effective permissions

### Permissions

```text
admin.roles.view
admin.roles.create
admin.roles.edit
admin.roles.delete
admin.permissions.view
admin.permissions.assign
```

## 4.17 Discord Settings

### Route

```text
/administration/discord
```

### Purpose

Configure Discord servers, channel mappings, role mappings, and bot status.

### Sections

- Bot health
- Connected servers
- Unit-server mapping
- Channel mappings
- Notification routing
- Delivery failures

### Primary Actions

- Add server mapping
- Map channel
- Test notification
- View sync status

### Permissions

```text
discord.view
discord.manage
discord.servers.manage
discord.channels.manage
discord.notifications.send
discord.bot.health.view
```

## 4.18 Audit Logs

### Route

```text
/administration/audit-logs
```

### Purpose

Review important administrative actions.

### Filters

- Actor
- Action
- Entity type
- Date range
- Search

### Primary Actions

- View details
- Export later

### Permissions

```text
audit.view
audit.export
```

## 5. MVP UI Implementation Rule

For the first Codex build, create all MVP routes with placeholder data and consistent layout.

Do not implement full business logic until the shell, routing, navigation, and component patterns are stable.
