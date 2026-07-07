# Automation Architecture

## 1. Purpose

Automation reduces repetitive administrative work while keeping humans in control of important decisions.

## 2. Core Principle

> Automate reminders, routing, logging, and synchronization before automating approvals.

The MVP should avoid fully autonomous sensitive decisions like promotions or transfers.

## 3. Automation Types

### Event-Based Automation

Runs immediately after a system event.

Examples:

- qualification awarded
- event published
- attendance finalized
- rank changed

### Scheduled Automation

Runs at a specific time or interval.

Examples:

- RSVP reminders
- qualification expiration checks
- attendance review reminders
- Discord sync checks

### Manual Automation

Triggered by staff.

Examples:

- send reminder
- sync Discord roles
- publish campaign update
- finalize attendance

## 4. Automation Lifecycle

```text
Trigger
    ↓
Validate Conditions
    ↓
Check Permissions/System Rules
    ↓
Execute Action
    ↓
Record Result
    ↓
Notify Relevant Users
    ↓
Audit if Required
```

## 5. MVP Automations

### Event Reminder

Trigger:

- scheduled before event start

Actions:

- find members who have not RSVP'd
- send Discord DM or channel reminder
- create portal notification

### Attendance Finalized

Trigger:

- staff locks attendance

Actions:

- update member attendance summaries
- update unit attendance metrics
- update campaign statistics if linked
- create audit log

### Qualification Awarded

Trigger:

- instructor awards qualification

Actions:

- update member qualification record
- recalculate readiness
- notify member
- notify leadership if qualification is required
- create audit log

### Rank or Unit Change

Trigger:

- staff changes rank or unit

Actions:

- update profile
- create profile log
- create audit log
- notify member and leadership
- queue Discord role sync later

### Discord Delivery Failure

Trigger:

- notification delivery fails

Actions:

- retry if recoverable
- log failure
- alert Discord manager after repeated failures

## 6. Automation Safety Rules

- Do not silently change sensitive records without logging.
- Do not automate promotions, transfers, or removals without approval.
- Do not let Discord failures roll back core portal records.
- Do not spam public channels.
- Every automation should be observable through logs.

## 7. Background Jobs

Recommended background job categories:

- notification delivery
- reminder scheduling
- Discord sync
- qualification expiration checks
- attendance summary recalculation
- cleanup tasks

## 8. Queue Strategy

MVP can start simple:

- database-backed pending deliveries
- scheduled cron job or server task
- manual retry action

Future:

- Redis/BullMQ queue if scale requires it

## 9. Automation Configuration

Later, admins may configure:

- reminder timing
- notification destinations
- role sync behavior
- qualification expiration reminders
- campaign update channels

MVP can hard-code safe defaults through configuration files/seed data.

## 10. Audit Requirements

Automations should record:

- automation type
- trigger source
- target record
- outcome
- errors
- timestamp

Sensitive automations should create AuditLog records.
