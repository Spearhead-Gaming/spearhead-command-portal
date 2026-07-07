# Discord Channel Mapping Specification

## 1. Purpose

Channel mappings define where portal events are posted in Discord.

Mappings should be managed from the portal admin interface.

## 2. Mapping Scope

A mapping may apply to:

- global community
- specific unit
- specific Discord server
- specific feature type

## 3. Mapping Types

Recommended mapping types:

- announcements
- events
- attendance
- patrols
- conops
- intel
- staff-alerts
- admin-alerts
- qualification-alerts
- promotion-alerts
- campaign-updates

## 4. Mapping Fields

Recommended fields:

- id
- serverId
- unitId, optional
- type
- channelId
- channelName
- isActive
- createdAt
- updatedAt

## 5. Routing Examples

### Reaper Event

Event host unit: Reaper  
Mapping type: events  
Destination: Reaper event channel

### Campaign Published

Deployment: active operation period  
Mapping type: campaign-updates  
Destination: configured campaign/update channel

### Patrol AAR Submitted

Source: Discord `/aar` modal or Portal AAR form  
Mapping type: staff-alerts  
Destination: S3/staff review channel

### Qualification Awarded

Member unit: Gambler  
Mapping type: qualification-alerts  
Destination: Gambler qualification/staff channel

### Bot Failure

Mapping type: admin-alerts  
Destination: system/admin Discord channel

## 6. Admin UI Requirements

The Discord Settings page should allow admins to:

- view connected servers
- map server to unit
- map channel type to Discord channel
- test channel delivery
- disable mapping
- view failed deliveries

## 7. Fallback Behavior

If no unit-specific mapping exists:

1. Try global mapping for the type.
2. If none exists, create failed delivery record.
3. Alert Discord Manager/Admin if possible.

## 8. Safety Rules

- Never guess a channel.
- Never post staff-only information to a public channel.
- Respect visibility and permission rules.
- Log mapping changes.

## 9. Operations Release Publishing

Operations Releases publish through the mapped `events` channel.

The Discord announcement should include Deployment, Operational Week, release version, Weekend Operation date/time, Commander's Intent, Tasking Summary, Unit Taskings, Deployment Resources, CONOP, OPORD, Player Primer, Current Mod Preset, RSVP buttons, and a View Portal link.

Publishing must create notification delivery records and store Discord message, channel, and delivery identifiers on the Operations Release.
