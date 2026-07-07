# Module Architecture

## Scope

Modules are designed around Spearhead Gaming workflows.

The system should avoid generic feature bloat while keeping enough separation to add future Spearhead-specific capabilities.

## Core Modules

### Core
Authentication, authorization, layout, notifications, audit logs, settings.

### Personnel
Profiles, ranks, statuses, service history, notes, logs.

### Units
Units, positions, billets, roster assignments, hierarchy.

### Training
Qualifications, qualification categories, member qualification records, instructor sign-off.

### Operations
Events, attendance, RSVP, operation history.

### Campaigns
Campaign pages, timelines, linked operations, campaign statistics.

### S3 Operations
Mission planning, CONOPs, AARs, approval workflow, mission maker assignment.

### Documents
SOPs, guides, CONOPs, AARs, intel, modpack guides.

### Communications
Announcements, notification routing, Discord posting.

### Administration
Users, roles, permissions, system settings, audit logs.

## Module Specification Format

Each module should define:

1. Spearhead workflow supported
2. Pain points solved
3. Portal features
4. Discord features
5. Data entities
6. Permissions
7. Notifications
8. Future expansion

## Dependency Rule

Modules may depend on Core.

Avoid circular module dependencies.
