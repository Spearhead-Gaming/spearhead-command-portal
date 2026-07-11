# Dashboard Widget Catalog

## Purpose

This document defines reusable dashboard widgets for the MVP.

Widgets should be modular and reusable across role-specific dashboards.

## Member Widgets

### Next Event Card

Shows:

- event title
- date/time
- RSVP status
- link to event

### Current Campaign Card

Shows:

- campaign title
- status
- current phase
- next mission
- progress

### My Unit Card

Shows:

- unit
- callsign
- position
- leadership contact/link

### Qualifications Card

Shows:

- earned qualifications count
- missing required count
- expiring soon count

### Attendance Card

Shows:

- recent attendance percentage
- last event status
- next RSVP required

## Unit Leadership Widgets

### Unit Strength Card

Shows:

- active count
- LOA count
- inactive count
- open billets

### Qualification Readiness Card

Shows:

- required quals complete
- missing quals
- members needing training

### Attendance Issues Card

Shows:

- missing RSVPs
- recent absences
- repeated no-shows

### Recent Personnel Changes

Shows:

- rank changes
- transfers
- status changes
- new members

## S3 Widgets

### Unified Operations Center

`/operations` is the Command and Control dashboard for S3, Command Staff, and administrators.

It consumes existing services instead of duplicating business logic:

- Operations Package Service
- Rule Engine
- Operational Health
- Recommendation Engine
- Patrol Service
- Deployment/S3 services
- Notification services
- Personnel, attendance, and qualification dashboard services

The dashboard should answer:

- What is happening?
- What needs attention?
- What should Command consider doing next?

### Operations Center Widget Contract

Each registered Operations Center widget exposes:

- id
- title
- icon
- priority
- permissions
- refresh interval
- size
- collapsed default
- data provider key

The dashboard renders registered widgets by permission and priority. Future customization may persist per-user collapsed, hidden, pinned, and reordered state.

### Active Campaigns

Shows:

- campaign names
- status
- progress
- next event

### Mission Review Queue

Shows:

- draft missions
- awaiting review
- approved/unpublished

### AAR Queue

Shows:

- completed missions missing AAR
- submitted AARs awaiting review

### Command Recommendations

Shows:

- critical recommendations
- high priority recommendations
- affected deployment/week/entity
- recommendation reason
- recommended action
- dismiss/resolve actions where allowed

### Operational Health

Shows:

- planning health
- execution health
- community health
- trend
- critical issues
- warnings

### Patrol Operations

Shows:

- active patrols
- patrols awaiting AAR
- AARs awaiting review
- recently completed patrols
- patrol leader visibility

### Deployment Timeline

Shows:

- planning/package changes
- Weekend Operations
- patrols
- Patrol AARs
- release history
- intent assessments
- progression notes

## Admin Widgets

### Discord Health

Shows:

- bot status
- connected servers
- failed notifications
- last sync

### Audit Activity

Shows:

- recent sensitive actions
- actor
- target
- timestamp

### Pending System Actions

Shows:

- unlinked users
- failed notifications
- role assignment issues
