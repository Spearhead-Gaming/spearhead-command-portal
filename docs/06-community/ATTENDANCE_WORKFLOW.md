# Attendance Workflow

## 1. Purpose

The attendance workflow defines how Spearhead tracks operation attendance, training participation, RSVP status, LOA, excused absences, and unit participation.

Attendance is a core readiness signal and should be easy for members and leadership to manage.

## 2. Guiding Principle

> Attendance should be recorded with as little manual work as possible.

## 3. Current Process Analysis

This section should be validated with unit leadership and S3.

Questions to answer:

- Where is attendance currently tracked?
- Who records attendance?
- Do members RSVP before events?
- Are absences excused before or after an event?
- How are LOA members handled?
- Are attendance percentages used for promotions or status decisions?
- Is attendance tracked separately by unit?
- Are Discord reactions/buttons used today?

## 4. Pain Points

Common issues this workflow should solve:

- Attendance tracked manually
- RSVP scattered in Discord
- No reliable attendance history
- Leadership manually calculates participation
- No easy no-show list
- No automatic reminders
- LOA and excused statuses unclear

## 5. Attendance Statuses

Recommended statuses:

- RSVP Yes
- RSVP No
- RSVP Maybe
- Present
- Absent
- Excused
- Late
- LOA

Separate RSVP status from final attendance status.

## 6. Event Attendance Workflow

Recommended future workflow:

```text
Event Created
    ↓
Discord RSVP Posted
    ↓
Members RSVP
    ↓
Reminder Sent
    ↓
Event Occurs
    ↓
Leadership Records Final Attendance
    ↓
Attendance Locked
    ↓
Unit Stats Updated
    ↓
Member Profiles Updated
    ↓
Audit Log Created
```

## 7. Required Portal Features

- Event attendance page
- RSVP tracking
- Final attendance recording
- Unit attendance summaries
- Member attendance history
- Attendance percentage
- No-show list
- Excused absence handling
- Attendance lock/finalization
- Search and filters

## Spearhead Attendance Doctrine

- Attendance is tracked and interpreted per unit.
- Unit dashboards should show attendance for that unit.
- Member attendance should be evaluated in the context of the member's assigned unit.
- Community-wide attendance should only be used as a high-level aggregate.
- Finalized attendance should remain event-backed and auditable.

## 8. Discord Integration

Potential Discord actions:

- Post RSVP buttons
- Remind members before event
- Notify leadership of low RSVP count
- Allow members to update RSVP
- Notify member when marked absent, optional
- Post final attendance summary to staff channel

## 9. Required Data

Core data objects:

- Event
- AttendanceRecord
- AttendanceStatus
- RSVPStatus
- Profile
- Unit
- Notification
- AuditLog

## 10. Permissions

Example permissions:

- `attendance.view`
- `attendance.record`
- `attendance.edit`
- `attendance.lock`
- `attendance.override`
- `attendance.reports.view`
- `events.attendance.manage`

## 11. Audit Requirements

Log all changes to:

- RSVP status
- Final attendance status
- Attendance override
- Attendance lock
- Excused absence changes

Each log should record:

- Actor
- Target member
- Event
- Previous status
- New status
- Reason
- Timestamp

## 12. Dashboard Integration

### Member Dashboard

Show:

- Upcoming RSVP-required events
- Current RSVP status
- Attendance percentage
- Recent attendance history

### Unit Dashboard

Show:

- Upcoming event RSVP count
- Missing RSVPs
- Attendance concerns
- Unit attendance percentage

### S3 Dashboard

Show:

- Event attendance readiness
- Unit participation expectations
- Low RSVP warnings
- Completed attendance needing review

## 13. Automation Opportunities

- Auto-remind members who have not RSVP'd
- Auto-mark LOA members as LOA for events
- Auto-generate no-show list
- Auto-update attendance percentage
- Auto-alert leadership for repeated absences

## 14. Future Expansion

Future attendance features:

- Attendance requirements by unit
- Promotion eligibility based on attendance
- Event check-in via Discord
- QR/check-in codes
- Attendance analytics
- Campaign attendance scoring
