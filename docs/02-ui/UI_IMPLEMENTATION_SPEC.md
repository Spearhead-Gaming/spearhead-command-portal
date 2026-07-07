# UI Implementation Specification

## 1. Purpose

This document defines how the MVP user interface should be implemented.

The first build should establish a clean, consistent interface that can support future modules without redesign.

## 2. UI Stack

Recommended stack:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react icons

## 3. Visual Style

The interface should feel:

- clean
- modern
- tactical
- readable
- professional
- not overly flashy

Avoid excessive animations, clutter, or heavy military decoration that harms usability.

## 4. Layout System

### App Shell

All authenticated routes should use an app shell.

Components:

- `AppShell`
- `SidebarNav`
- `TopBar`
- `PageHeader`
- `PageContent`
- `MobileNav`
- `UserMenu`
- `NotificationButton`
- `GlobalSearchButton`

### Page Header Pattern

Each page should include:

- title
- short description
- optional breadcrumbs
- primary action button
- secondary actions, optional

Example:

```text
Roster
Manage member ranks, units, positions, and statuses.

[Add Member] [Bulk Update]
```

## 5. Component Standards

### Dashboard Cards

Use cards for summary data.

Each card should have:

- title
- value
- description
- optional icon
- optional trend/status

### Data Tables

Data tables should support:

- search
- filters
- sorting
- pagination
- row actions
- responsive fallback
- empty state

### Badges

Use badges for:

- rank
- unit
- status
- qualification status
- attendance status
- campaign status
- event status

### Forms

Forms should use:

- clear labels
- validation messages
- grouped sections
- cancel/save actions
- destructive action confirmation

### Empty States

Every major page should have a designed empty state.

Example:

```text
No qualifications found.
Create the first qualification to begin tracking member readiness.
```

## 6. Responsive Behavior

### Desktop

- Sidebar visible
- Tables use full width
- Cards can be multi-column

### Tablet

- Sidebar may collapse
- Tables remain usable
- Filters may move into dropdown/drawer

### Mobile

- Sidebar becomes drawer
- Tables become cards where needed
- Primary actions remain visible
- Avoid horizontal scrolling where practical

## 7. Permission-Aware UI

The UI may hide or disable actions based on permissions.

However:

- UI checks are convenience only.
- Server-side checks are mandatory.
- Hidden buttons do not replace backend authorization.

## 8. Navigation Behavior

Navigation should be grouped by module:

- Dashboard
- Personnel
- Units
- Operations
- Training
- Documents
- Administration

Administration should only appear for users with relevant admin permissions.

## 9. Placeholder Data Rule

For the first build, pages may use placeholder/mock data.

Mock data should resemble Spearhead structure:

- Spearhead Command
- Reaper
- Misfit
- Gambler
- Viking

Do not hard-code these names into business logic. Mock data is acceptable for UI placeholders only.

## 10. Status Colors

Recommended semantic usage:

- Active / Success: green
- Warning / Pending: amber
- Danger / Failed: red
- Informational: blue
- Muted / Archived: gray

Exact colors should be controlled through Tailwind theme tokens.

## 11. Accessibility Requirements

- Use semantic HTML
- Use accessible shadcn/ui components
- Ensure keyboard navigation
- Provide visible focus states
- Use sufficient contrast
- Do not rely on color alone for status meaning

## 12. First Build UI Deliverables

Codex should create:

- App shell
- Sidebar navigation
- Top bar
- Page header component
- Dashboard card component
- Status badge component
- Data table placeholder component
- Empty state component
- Placeholder pages for MVP screen map
