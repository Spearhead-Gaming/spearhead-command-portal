# Database Architecture

## Database Engine

MariaDB is the primary database engine.

## ORM

Prisma is the ORM and migration tool.

## Standards

- Use UUID-style string IDs where practical
- Use createdAt and updatedAt on core tables
- Use soft deletes for important user-facing records
- Use audit logs for administrative changes
- Avoid database-specific features that complicate portability
- Normalize relational data

## Core Entity Groups

### Identity
- User
- Account
- Session

### Personnel
- Profile
- Rank
- ProfileStatus
- ProfileNote
- ProfileLog
- PersonnelAction
- TransferRequest
- LeaveOfAbsence

Member profiles should treat `displayName` as the primary visible identity in the portal. Discord-provided display names are preferred when available. `firstName` and `lastName` may exist as optional metadata, and rank remains optional rather than a required roster field.

### Units
- Unit
- Position
- UnitSlot
- RosterAssignment
- AttendancePolicy

Unit and position records may define readiness context such as max occupants, reporting relationships, qualification expectations, and attendance policy. These records must not grant permissions directly; permissions still flow through roles and scoped role assignments.

### Training
- Qualification
- QualificationCategory
- MemberQualification

### Operations
- Event
- AttendanceStatus
- AttendanceRecord

### Campaigns
- Campaign
- CampaignEvent
- CONOP
- AAR

### Communications
- Announcement
- Notification
- NotificationDelivery

### Discord
- DiscordServer
- DiscordChannelMapping
- DiscordRoleMapping
- DiscordMemberLink
- DiscordGuildMemberState

Discord user ID is the canonical external identity key. Discord OAuth login and guild member sync must converge on the same `User` and `MemberProfile` by Discord user ID. Discord may update identity fields such as display name, username, avatar, and link state, but it must not overwrite portal-owned operational fields such as unit, position, status, qualifications, attendance, or permissions.

Exact duplicate identities should be repaired by linking records to the canonical Discord user ID and archiving superseded portal records. Likely duplicates based only on display name are review warnings and must not be merged automatically.

### Administration
- Role
- Permission
- AuditLog
- SystemSetting
