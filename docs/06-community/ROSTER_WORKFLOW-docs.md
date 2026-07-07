# Roster Workflow

## 1. Purpose

The roster workflow defines how Spearhead Gaming tracks members, ranks, units, positions, statuses, transfers, and personnel history.

The roster is the foundation of the portal. Qualifications, attendance, campaigns, Discord roles, promotions, transfers, awards, and future modules all depend on accurate member data.

## 2. Guiding Principle

> A member should only exist once.

All related systems should reference the same official member profile.

## 3. Current Process Analysis

This section should be validated with Spearhead leadership before implementation.

Questions to answer:

- Where is the roster currently tracked?
- Who updates roster data today?
- How are new members added?
- How are initial unit assignments decided?
- Who can approve rank changes?
- Who can approve transfers?
- How are inactive members handled?
- How are LOA members tracked?
- Are Discord roles manually updated?
- Are Discord nicknames manually updated?
- Are rank/unit changes announced publicly?

## 4. Pain Points

Common issues this workflow should solve:

- Duplicate records across spreadsheets, Discord, and documents
- Manual rank and role changes
- No single member service history
- Difficult transfer tracking
- Unclear inactive/LOA status
- No audit trail for changes
- Hard-to-search roster data
- Leadership spending time on repetitive updates

## 5. Member Lifecycle

```text
Applicant
    ↓
Accepted
    ↓
Recruit
    ↓
Assigned to Unit
    ↓
Active Member
    ├── Promotion
    ├── Transfer
    ├── LOA
    ├── Reserve
    └── Inactive
    ↓
Retired / Discharged / Banned
```

## 6. Member Statuses

Recommended initial statuses:

- Applicant
- Recruit
- Active
- Reserve
- LOA
- Inactive
- Retired
- Discharged
- Banned

Statuses should be configurable seed data.

## 7. Member Profile Requirements

Each member profile should include:

- Display name
- Discord ID
- Steam ID / Arma ID
- Rank
- Current unit
- Current position
- Status
- Join date
- Attendance summary
- Qualifications
- Awards
- Campaign participation
- Service timeline
- Notes, if authorized
- Logs

## 8. Rank and Position Separation

Rank and position must be separate.

Example:

- Rank: SPC
- Position: Squad Leader
- Unit: Reaper

Do not combine rank and billet into one field.

## 9. Unit Assignment

Each member should have:

- Current unit
- Current position
- Current rank
- Current status
- Assignment start date
- Assignment end date, if historical
- Transfer history

## 10. Promotion Workflow

Recommended future workflow:

```text
Promotion Recommendation
    ↓
Leadership Review
    ↓
Approval
    ↓
Roster Updated
    ↓
Discord Role Updated
    ↓
Announcement Posted
    ↓
Profile Log Created
    ↓
Audit Log Created
```

## 11. Transfer Workflow

Recommended future workflow:

```text
Transfer Request
    ↓
Current Unit Review
    ↓
Receiving Unit Review
    ↓
Approval
    ↓
Roster Assignment Updated
    ↓
Previous Unit Notified
    ↓
Receiving Unit Notified
    ↓
Discord Role Updated
    ↓
Profile Timeline Updated
    ↓
Audit Log Created
```

## 12. Transfer Types

Initial transfer types:

- Normal Transfer
- Administrative Transfer
- RASP Transfer
- Leadership Assignment
- Temporary Assignment

RASP should be implemented later as a specialized transfer workflow.

## 13. Required Portal Features

- Member list
- Roster table
- Member profile page
- Rank editor
- Unit assignment editor
- Position assignment editor
- Status editor
- Transfer history
- Profile logs
- Search and filters
- Bulk roster actions
- Audit logs

## 14. Discord Integration

Potential Discord actions:

- Announce promotion
- Announce transfer
- Notify previous unit leadership
- Notify receiving unit leadership
- Update Discord role
- Update Discord nickname, optional
- Notify member of roster changes
- Alert S1 for pending personnel actions

## 15. Required Data

Core data objects:

- Profile
- Rank
- Unit
- Position
- RosterAssignment
- ProfileStatus
- ProfileLog
- TransferRequest
- AuditLog
- DiscordRoleMapping

## 16. Permissions

Example permissions:

- `personnel.view`
- `personnel.edit`
- `roster.view`
- `roster.manage`
- `rank.change`
- `unit.assign`
- `position.assign`
- `status.change`
- `transfer.request`
- `transfer.approve`
- `profile.notes.view`
- `profile.notes.manage`

## 17. Audit Requirements

Log all changes to:

- Rank
- Unit
- Position
- Status
- Transfer approval
- Profile notes
- Profile logs
- Discord role sync failures

Each log should record:

- Actor
- Target member
- Action
- Previous value
- New value
- Reason
- Timestamp

## 18. Dashboard Integration

### Member Dashboard

Show:

- Rank
- Unit
- Position
- Status
- Attendance
- Qualifications
- Current campaign

### Unit Dashboard

Show:

- Unit strength
- Active members
- LOA members
- Inactive members
- Open billets
- Recent personnel changes

### S1 Dashboard

Show:

- Pending transfers
- Recent promotions
- Status changes
- New members
- Inactive risk list

## 19. Future Expansion

Future personnel-related modules:

- Recruiting
- RASP
- Awards
- Promotion boards
- Counseling records
- Disciplinary records
- Automated service timelines
