# Events Module

## Purpose

Manage scheduled operations, trainings, and community events.

## Event Types

- Weekend Operation
- Patrol
- Training
- Meeting
- Community Event

## Core Fields

- Title
- Description
- Date/time
- Host unit
- Deployment week, when linked to a deployment
- Weekly Tasking, when this is a deployment operation
- Required qualifications
- RSVP deadline
- Attendance status
- Related deployment
- Related CONOP

## Discord Behavior

Events can post to mapped Discord channels with RSVP buttons.

Weekend operation announcements should include Weekly Tasking and Unit Tasking before RSVP details. Patrols should highlight whether an AAR is required or already submitted.

## Patrol Behavior

Patrols are lightweight Event records tied to a Deployment and operational week. User-facing copy should say Start Patrol, not Create Patrol.

Patrol RSVP means interest only. It must not create or imply final Weekend Operation attendance. Confirmed patrol participants are tracked separately and may be added manually by patrol leaders or staff.

Patrols always require a Patrol AAR after completion, including the required map screenshot before S3 review can finalize the report.
