# Module Architecture

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

### Documents
SOPs, guides, CONOPs, AARs, intel, modpack guides.

### Communications
Announcements, notification routing, Discord posting.

### Administration
Users, roles, permissions, system settings, audit logs.

## Module Rules

Each module should define:
- purpose
- entities
- services
- UI pages
- permissions
- notification events
- Discord interactions if applicable

## Dependency Rule

Modules may depend on Core.

Avoid circular module dependencies.
