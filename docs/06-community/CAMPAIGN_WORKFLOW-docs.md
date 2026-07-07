# Campaign Workflow

## 1. Purpose

The campaign workflow defines how Spearhead groups related operations into readable, trackable deployments or story arcs.

Campaigns should help members understand what is happening and help S3 organize operations over time.

## 2. Guiding Principle

> Campaigns should make operations easier to follow, not harder to manage.

## 3. Current Process Analysis

Questions to answer:

- Does Spearhead currently run named campaigns?
- Where is campaign information posted?
- Are operations grouped by deployment/story?
- Are CONOPs stored together?
- Are AARs connected to campaigns?
- Are campaign awards or participation tracked?
- Does S3 track campaign progress?

## 4. Pain Points

Common issues this workflow should solve:

- Operations feel disconnected
- Campaign information disappears in Discord
- Members cannot easily review previous missions
- CONOPs and AARs are scattered
- S3 lacks a clean campaign progress view
- Participation is hard to track

## 5. Campaign Lifecycle

```text
Planning
    ↓
Active
    ↓
Paused, optional
    ↓
Completed
    ↓
Archived
```

## 6. Campaign Page Requirements

Each campaign page should include:

- Campaign title
- Status
- Current phase
- Overview
- Story/background
- Participating units
- Operation timeline
- Upcoming operation
- Completed operations
- CONOP links
- AAR links
- Attendance statistics
- Campaign media
- Related documents

## 7. Campaign Event Relationship

Campaigns contain events.

Events may include:

- Briefing
- Training
- Main operation
- Side operation
- Final operation
- AAR meeting

## 8. Required Portal Features

- Campaign list
- Campaign detail page
- Campaign timeline
- Campaign event linking
- Campaign documents
- Campaign media
- Campaign statistics
- S3 campaign editor

## 9. Discord Integration

Potential Discord actions:

- Announce campaign creation
- Announce new campaign event
- Post campaign updates
- Notify units assigned to campaign
- Post campaign completion summary
- Link to campaign page from Discord

## 10. Required Data

Core data objects:

- Campaign
- CampaignPhase
- CampaignEvent
- Event
- CONOP
- AAR
- Document
- Media
- AttendanceRecord
- Unit

## 11. Permissions

Example permissions:

- `campaigns.view`
- `campaigns.create`
- `campaigns.edit`
- `campaigns.publish`
- `campaigns.archive`
- `campaigns.documents.manage`
- `campaigns.statistics.view`

## 12. Audit Requirements

Log all changes to:

- Campaign creation
- Campaign status changes
- Campaign phase changes
- Campaign event changes
- Campaign archive
- Campaign document changes

## 13. Dashboard Integration

### Member Dashboard

Show:

- Current campaign
- Next campaign event
- Campaign progress

### Unit Dashboard

Show:

- Unit campaign participation
- Campaign attendance
- Upcoming campaign events

### S3 Dashboard

Show:

- Active campaigns
- Campaign progress
- Campaign events needing CONOPs
- AARs missing from campaign events

## 14. Future Expansion

Future campaign features:

- Campaign ribbons
- Participation awards
- Campaign readiness requirements
- Campaign maps
- Campaign lore/intel pages
- Campaign media galleries
