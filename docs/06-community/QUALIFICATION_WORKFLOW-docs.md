# Qualification Workflow

## 1. Purpose

The qualification workflow defines how Spearhead tracks training, qualifications, certifications, instructor sign-offs, readiness, and qualification requirements by unit or position.

Qualifications are one of the most important MVP features because they help leadership understand who is ready for specific roles, missions, and units.

## 2. Guiding Principle

> Qualifications should be easy to award, easy to verify, and easy to understand.

## 3. Current Process Analysis

This section should be validated with Spearhead training staff and unit leadership.

Questions to answer:

- Where are qualifications currently tracked?
- Who can award qualifications?
- Are qualifications tied to specific units?
- Are qualifications tied to positions?
- Do qualifications expire?
- Are instructors tracked?
- Are failed attempts tracked?
- Are training events tied to qualifications?
- Are qualification announcements posted in Discord?

## 4. Pain Points

Common issues this workflow should solve:

- Qualification status buried in spreadsheets
- Leadership unsure who is qualified
- No easy readiness matrix
- Manual instructor sign-off
- No expiration tracking
- No clean member progress view
- Unit requirements not visible
- Training history not connected to profiles

## 5. Qualification Categories

Example categories:

- Basic Infantry
- Leadership
- Medical
- Communications
- Aviation
- Armor
- Reconnaissance
- Mission Maker
- Zeus
- Unit-Specific
- Ranger / RASP
- Staff

Categories should be configurable.

## 6. Qualification Record

Each member qualification should include:

- Member
- Qualification
- Status
- Awarded by
- Awarded date
- Expiration date, optional
- Notes
- Related training event, optional
- Related unit, optional
- Related position requirement, optional

## 7. Qualification Statuses

Recommended statuses:

- Not Started
- In Progress
- Pending Sign-Off
- Qualified
- Expired
- Revoked
- Failed

## 8. Awarding Workflow

Recommended future workflow:

```text
Training Completed
    ↓
Instructor Reviews
    ↓
Qualification Awarded
    ↓
Profile Updated
    ↓
Unit Readiness Recalculated
    ↓
Member Notified
    ↓
Leadership Notified if Required
    ↓
Audit Log Created
```

## 9. Revocation Workflow

```text
Revocation Initiated
    ↓
Authorized Review
    ↓
Qualification Revoked
    ↓
Profile Updated
    ↓
Readiness Recalculated
    ↓
Member Notified
    ↓
Audit Log Created
```

## 10. Required Portal Features

- Qualification catalog
- Qualification categories
- Member qualification page
- Qualification matrix
- Unit qualification readiness
- Position requirement mapping
- Instructor sign-off
- Expiration tracking
- Search and filters
- Bulk qualification assignment, optional

## 11. Qualification Matrix

The qualification matrix should show members as rows and qualifications as columns.

Useful filters:

- Unit
- Position
- Qualification category
- Status
- Expiring soon
- Missing required

Example:

```text
Member        CLS    RTO    Airborne    Pilot
J. Thomas     Yes    Yes    No          No
A. Smith      Yes    No     Yes         No
```

## 12. Discord Integration

Potential Discord actions:

- Notify member when qualification is awarded
- Notify unit leadership when required qualification is missing
- Announce major qualifications if configured
- Allow `/quals` command
- Allow `/profile` command to show qualifications
- Alert instructors for pending sign-off

## 13. Required Data

Core data objects:

- Qualification
- QualificationCategory
- MemberQualification
- QualificationRequirement
- InstructorAssignment
- TrainingEvent
- AuditLog
- Notification

## 14. Permissions

Example permissions:

- `qualifications.view`
- `qualifications.manage`
- `qualifications.award`
- `qualifications.revoke`
- `qualifications.requirements.manage`
- `qualifications.matrix.view`
- `training.instructor`

## 15. Audit Requirements

Log all changes to:

- Qualification awarded
- Qualification revoked
- Qualification expired
- Requirement added
- Requirement removed
- Instructor sign-off
- Qualification notes

Each log should record:

- Actor
- Target member
- Qualification
- Action
- Previous status
- New status
- Reason
- Timestamp

## 16. Dashboard Integration

### Member Dashboard

Show:

- Earned qualifications
- Missing required qualifications
- Expiring qualifications
- Pending sign-offs

### Unit Dashboard

Show:

- Unit qualification readiness
- Missing required qualifications
- Members needing training
- Expiring qualifications

### Training Dashboard

Show:

- Pending sign-offs
- Upcoming training events
- Qualification gaps
- Instructor workload

## 17. Future Expansion

Future qualification-related modules:

- Training school
- Auto-award from event attendance
- Qualification prerequisites
- Certification renewals
- Qualification-based event eligibility
- RASP qualification gates
