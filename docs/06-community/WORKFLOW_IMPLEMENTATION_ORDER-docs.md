# Workflow Implementation Order

## Purpose

This document defines the recommended order for turning Spearhead workflows into working software.

## Recommended Order

### 1. Roster Workflow

Reason:
Everything depends on accurate member, unit, rank, and position data.

Build first:
- Member profiles
- Units
- Ranks
- Positions
- Roster assignments
- Statuses
- Basic audit logs

### 2. Qualification Workflow

Reason:
Qualification tracking is a primary project goal and enables readiness views.

Build second:
- Qualification catalog
- Member qualifications
- Instructor sign-off
- Qualification matrix
- Required qualifications

### 3. Attendance Workflow

Reason:
Events and attendance are high-value and Discord-friendly.

Build third:
- Events
- RSVP
- Attendance records
- Discord RSVP buttons
- Attendance summaries

### 4. Campaign Workflow

Reason:
Campaigns become useful once events and attendance exist.

Build fourth:
- Campaign pages
- Event grouping
- Campaign timeline
- Campaign stats

### 5. S3 Mission Workflow

Reason:
S3 tools depend on events, campaigns, weekly operation package resources, and AAR records.

Build fifth:
- Mission lifecycle
- Weekly operation package resources
- Review queue
- AAR tracking and progression recommendations

### 6. Discord Communication Workflow

Reason:
Basic Discord integration should exist early, but advanced automation should be layered in after core data exists.

Build throughout:
- OAuth first
- RSVP buttons with attendance
- Notification routing with each module
- Role sync after personnel is stable

## Build Rule

Do not automate a workflow until the manual portal workflow works cleanly.
