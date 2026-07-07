# Component Library

## 1. Purpose

The Spearhead Command Portal should be built from reusable components instead of one-off page designs.

This keeps the interface:

- consistent
- easier to expand
- easier for Codex to build
- easier to maintain
- easier for users to learn

## 2. Design Direction

The visual style should feel like:

> Modern Operations Center + Enterprise Dashboard + Subtle Milsim Influence

Avoid heavy military clichés.

Do not overuse:

- camouflage textures
- bright neon green
- fake radar effects
- stencil fonts
- noisy backgrounds
- excessive animation

Use subtle details instead:

- clean dark surfaces
- thin borders
- tactical accent colors
- compact badges
- clean data tables
- smooth drawers
- readable dashboards

---

# 3. Core Layout Components

## 3.1 AppShell

### Purpose

Provides the authenticated application layout.

### Anatomy

- Sidebar navigation
- Top bar
- Page content
- Optional right command panel
- Toast region
- Mobile navigation drawer

### Rules

- All logged-in routes use AppShell.
- AppShell should not contain business logic.
- Navigation visibility should respect permissions.

---

## 3.2 SidebarNav

### Purpose

Primary app navigation.

### Sections

- Dashboard
- Personnel
- Units
- Operations
- Training
- Documents
- Administration

### States

- expanded
- collapsed
- mobile drawer
- active item
- disabled item

### Rules

- Hide sections the user cannot access.
- Keep labels short.
- Use consistent outline icons.

---

## 3.3 TopBar

### Purpose

Global controls and context.

### Contains

- current page context
- global search / command palette trigger
- notification button
- user menu
- Discord connection indicator, optional

---

## 3.4 PageHeader

### Purpose

Standard header for every page.

### Anatomy

- title
- description
- breadcrumbs, optional
- primary action button
- secondary actions, optional

### Example

```text
Roster
Manage member ranks, units, positions, and statuses.

[Add Member] [Bulk Update]
```

---

# 4. Dashboard Components

## 4.1 DashboardGrid

### Purpose

Provides consistent dashboard layout.

### Rules

- Support responsive columns.
- Allow widgets to be reordered later.
- Avoid dense walls of cards.

---

## 4.2 DashboardWidget

### Purpose

Reusable card for dashboard information.

### Anatomy

- title
- value
- description
- icon
- status badge
- action link

### Variants

- metric
- list
- timeline
- alert
- progress
- action

### States

- normal
- loading
- empty
- warning
- critical

---

## 4.3 KPI Card

### Purpose

Displays one key metric.

### Examples

- Unit Strength
- Attendance %
- Open Billets
- Missing Qualifications
- Active Campaigns

### Anatomy

- label
- large value
- supporting text
- trend/status
- icon

---

## 4.4 Readiness Card

### Purpose

Shows readiness for a member, unit, campaign, or event.

### Suggested Metrics

- personnel readiness
- qualification readiness
- attendance readiness
- operation readiness

### Visuals

- progress bar
- percentage
- status label
- drill-down action

---

# 5. Data Display Components

## 5.1 DataTable

### Purpose

Primary dense-data component.

### Required Features

- search
- filter bar
- sorting
- pagination
- row actions
- loading state
- empty state
- responsive fallback

### Common Usage

- roster
- member list
- qualifications
- attendance
- audit logs
- users
- roles

### Rules

- Do not overload tables with too many columns.
- Use badges for status.
- Keep row actions consistent.

---

## 5.2 FilterBar

### Purpose

Provides table and list filtering.

### Common Filters

- unit
- rank
- status
- qualification
- date range
- role
- event type

### Rules

- Use visible filters for common options.
- Move advanced filters into a popover or drawer.

---

## 5.3 SearchInput

### Purpose

Local search inside tables/lists.

### Rules

- Always include placeholder text.
- Debounce search.
- Make `/` keyboard shortcut focus table search later.

---

## 5.4 EmptyState

### Purpose

Provides useful guidance when no data exists.

### Anatomy

- icon
- title
- short explanation
- primary action
- optional secondary action

### Example

```text
No campaigns yet.

Campaigns organize operations into long-running deployments.

[Create Campaign]
```

---

# 6. Identity Components

## 6.1 MemberAvatar

### Purpose

Shows member identity.

### Variants

- image
- initials
- status ring
- compact
- large profile

---

## 6.2 MemberCard

### Purpose

Compact member display.

### Anatomy

- avatar
- display name
- rank
- unit
- position
- status
- quick actions

### Usage

- dashboard widgets
- hover previews
- search results
- roster cards on mobile

---

## 6.3 MemberHoverCard

### Purpose

Quick preview when hovering or focusing a member name.

### Shows

- avatar
- name
- rank
- unit
- position
- attendance
- qualification count
- profile link/action

### Rule

Do not require navigation for basic member context.

---

## 6.4 ProfileHeader

### Purpose

Top section of member profile or inspector.

### Shows

- avatar
- display name
- rank badge
- unit badge
- position
- status
- primary actions

---

# 7. Badge and Status Components

## 7.1 StatusBadge

### Purpose

Displays operational state.

### Examples

- Active
- LOA
- Inactive
- Planning
- Published
- Qualified
- Expired
- Present
- Absent

### Rules

- Use color plus text.
- Do not rely on color alone.

---

## 7.2 RankBadge

### Purpose

Displays rank in a compact format.

### Usage

- roster
- profile header
- search results
- hover cards

---

## 7.3 UnitBadge

### Purpose

Displays unit and optional callsign.

### Example

```text
Reaper
3rd Infantry Division
```

---

## 7.4 QualificationBadge

### Purpose

Displays qualification state.

### Variants

- earned
- required
- missing
- expired
- revoked
- pending sign-off

---

## 7.5 AttendanceBadge

### Purpose

Displays attendance or RSVP status.

### Variants

- RSVP Yes
- RSVP No
- RSVP Maybe
- Present
- Absent
- Excused
- Late
- LOA

---

# 8. Inspector and Context Components

## 8.1 InspectorDrawer

### Purpose

Reusable right-side drawer for inspecting objects without leaving the current page.

### Supported Objects

- member
- unit
- event
- campaign
- qualification
- document

### Required Tabs

- Overview
- Activity
- Notes
- Documents
- History
- Related

### States

- loading
- loaded
- unsaved changes
- error
- permission restricted

### Rules

- Preserve page context behind drawer.
- Drawer should be closable with Esc.
- Drawer should support deep linking later.
- Drawer should not become a replacement for full workspaces.

---

## 8.2 ActionMenu

### Purpose

Consistent object action menu.

### Common Actions

- edit
- favorite
- copy link
- share
- archive
- view history
- add note
- more

---

## 8.3 QuickActionBar

### Purpose

Persistent important actions in drawers or profile headers.

### Examples

For member:

- Promote
- Transfer
- Award Qualification
- Add Note

For event:

- RSVP
- Record Attendance
- Send Reminder

---

# 9. Timeline and Activity Components

## 9.1 ActivityTimeline

### Purpose

Shows chronological activity for an object.

### Used On

- member profiles
- units
- campaigns
- events
- audit views

### Entry Types

- created
- updated
- promoted
- transferred
- qualification awarded
- attendance recorded
- event published
- campaign updated
- note added

---

## 9.2 ActivityFeed

### Purpose

Shows recent system/community activity.

### Usage

- dashboard
- right operations panel
- unit dashboard
- admin dashboard

---

## 9.3 AuditLogEntry

### Purpose

Displays audit information in a readable way.

### Shows

- actor
- action
- target
- timestamp
- reason
- old/new values, expandable

---

# 10. Command and Navigation Components

## 10.1 CommandPalette

### Purpose

Global search and quick actions.

### Shortcut

```text
Ctrl + K
```

### Search Targets

- members
- units
- events
- campaigns
- qualifications
- documents

### Action Targets

- create event
- award qualification
- promote member
- open roster
- open campaign
- open dashboard

---

## 10.2 RecentlyViewedList

### Purpose

Fast access to recent objects.

### Objects

- members
- campaigns
- events
- qualifications
- documents

---

## 10.3 FavoritesList

### Purpose

Allows users to pin important pages or objects.

### Examples

- Reaper
- Roster
- Qualification Matrix
- Current Campaign

---

# 11. Operations Components

## 11.1 EventCard

### Purpose

Displays operation/training/community event summary.

### Shows

- title
- type
- date/time
- host unit
- RSVP status
- attendance status
- campaign link

---

## 11.2 CampaignCard

### Purpose

Displays campaign overview.

### Shows

- title
- status
- current phase
- participating units
- next operation
- progress

---

## 11.3 MissionStatusStepper

### Purpose

Displays mission lifecycle.

```text
Draft → S3 Review → Approved → Published → Completed → AAR Submitted → Archived
```

---

## 11.4 RSVPPanel

### Purpose

Allows member to RSVP from portal.

### Actions

- Yes
- No
- Maybe

### Discord Rule

RSVP state should match Discord interaction state when connected.

---

# 12. Training Components

## 12.1 QualificationMatrix

### Purpose

Grid showing members vs qualifications.

### Requirements

- sticky member column
- sticky qualification header
- filters
- compact status cells
- click cell to open qualification record drawer

---

## 12.2 QualificationRecordCard

### Purpose

Displays a member qualification.

### Shows

- qualification
- status
- awarded by
- awarded date
- expiration date
- notes

---

## 12.3 RequirementIndicator

### Purpose

Shows if member/unit/position requirement is met.

### States

- met
- missing
- expiring
- not applicable

---

# 13. Discord Components

## 13.1 DiscordStatusCard

### Purpose

Shows bot/server health.

### Shows

- bot online/offline
- connected servers
- failed deliveries
- last sync

---

## 13.2 ChannelMappingTable

### Purpose

Maps portal features to Discord channels.

### Columns

- unit
- mapping type
- channel
- enabled
- test action

---

## 13.3 NotificationDeliveryStatus

### Purpose

Shows whether notification was delivered.

### States

- pending
- sent
- failed
- retrying

---

# 14. Feedback Components

## 14.1 Toast

### Purpose

Short feedback after actions.

### Examples

- Profile updated
- Qualification awarded
- Discord notification sent
- Attendance locked

---

## 14.2 ConfirmDialog

### Purpose

Confirm destructive or important actions.

### Required For

- archive member
- revoke qualification
- delete event
- lock attendance
- remove role

---

## 14.3 LoadingSkeleton

### Purpose

Smooth loading states.

### Rule

Use skeletons instead of blank pages where possible.

---

## 14.4 ErrorState

### Purpose

Readable recovery from failure.

### Shows

- what happened
- suggested action
- retry button if applicable

---

# 15. Component Implementation Rule

Codex should implement components in a shared component directory and reuse them across screens.

Recommended structure:

```text
src/components/layout/
src/components/dashboard/
src/components/data/
src/components/identity/
src/components/status/
src/components/inspector/
src/components/activity/
src/components/command/
src/components/operations/
src/components/training/
src/components/discord/
src/components/feedback/
```
