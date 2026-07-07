# Database ERD

## Purpose

This document provides a readable entity relationship overview for the Spearhead Command Portal database.

This is not a full replacement for the Prisma schema. It is intended to help reason about relationships before implementation.

## Core ERD

```mermaid
erDiagram
    User ||--o| MemberProfile : owns
    User ||--o{ UserRole : has
    Role ||--o{ UserRole : assigned
    Role ||--o{ RolePermission : includes
    Permission ||--o{ RolePermission : grants

    ProfileStatus ||--o{ MemberProfile : classifies
    Rank ||--o{ MemberProfile : current_rank
    Unit ||--o{ MemberProfile : current_unit
    Position ||--o{ MemberProfile : current_position

    Unit ||--o{ Unit : parent_child
    Unit ||--o{ Position : contains
    Unit ||--o{ UnitSlot : defines
    Position ||--o{ UnitSlot : fills

    MemberProfile ||--o{ RosterAssignment : has_history
    Unit ||--o{ RosterAssignment : assigned_to
    Position ||--o{ RosterAssignment : billet
    Rank ||--o{ RosterAssignment : rank_at_assignment

    QualificationCategory ||--o{ Qualification : groups
    MemberProfile ||--o{ MemberQualification : earns
    Qualification ||--o{ MemberQualification : awarded
    Qualification ||--o{ QualificationRequirement : required_by
    Unit ||--o{ QualificationRequirement : requires
    Position ||--o{ QualificationRequirement : requires

    Campaign ||--o{ Event : contains
    Unit ||--o{ Event : hosts
    Event ||--o{ AttendanceRecord : tracks
    MemberProfile ||--o{ AttendanceRecord : attends

    Notification ||--o{ NotificationDelivery : sends
    Unit ||--o{ DiscordServer : maps
    DiscordServer ||--o{ DiscordChannelMapping : has
    DiscordServer ||--o{ DiscordRoleMapping : has
```

## MVP Relationship Focus

For MVP, prioritize:

```text
User
MemberProfile
ProfileStatus
Rank
Unit
Position
RosterAssignment
QualificationCategory
Qualification
MemberQualification
QualificationRequirement
Event
AttendanceRecord
Campaign
Permission
Role
RolePermission
UserRole
DiscordServer
DiscordChannelMapping
Notification
NotificationDelivery
AuditLog
```

## Deferred ERD Areas

These can be fully modeled later:

- RASP
- Awards
- Recruiting
- Applications
- Advanced documents
- Advanced automation flows
- API clients
- S2 intelligence details
- S4 logistics details
