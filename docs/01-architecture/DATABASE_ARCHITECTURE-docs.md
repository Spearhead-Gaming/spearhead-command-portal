# Database Architecture

## Database Engine

MariaDB is the primary database engine.

## ORM

Prisma is the ORM and migration tool.

## Database Philosophy

The database should be designed for Spearhead Gaming, while keeping operational data configurable.

The current unit structure should be seeded as data, not hard-coded into the schema or application logic.

## Standards

- Use UUID-style string IDs where practical
- Use createdAt and updatedAt on core tables
- Use soft deletes for important user-facing records
- Use audit logs for administrative changes
- Avoid database-specific features that complicate portability
- Normalize relational data
- Store Spearhead setup as seed data

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

### Units
- Unit
- Position
- UnitSlot
- RosterAssignment

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

### Administration
- Role
- Permission
- AuditLog
- SystemSetting

## Seed Data Requirements

Initial seed data should include:
- Spearhead units
- rank structure
- base roles
- base permissions
- attendance statuses
- profile statuses
- campaign statuses
- default qualification categories
