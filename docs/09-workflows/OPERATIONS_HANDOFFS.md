# Operations Handoffs

Operations work is intentionally multi-persona. The portal should make the handoff path visible without forcing every persona to read every operational detail.

## Canonical Handoff Path

1. Deployment Creator creates or maintains the deployment parent record.
2. S3 opens the operational week package and prepares weekly tasking.
3. Unit leadership receives unit tasking and readiness context.
4. Zeus receives CONOP, resources, mod preset, timeline, and operation version context.
5. Members receive the published operation package with RSVP, resources, tasking context, and current mod preset.
6. Patrol leaders submit patrol AARs and screenshots.
7. S3 reviews AAR progression notes and updates next-week planning context.
8. Command reviews intent alignment, readiness, and progression recommendations.

## UI Expectations

- Each page should show the current owner and next owner when a handoff is pending.
- Handoff detail belongs in a drawer, tab, or collapsed timeline unless it blocks the next action.
- AAR progression notes should be visible to S3 and command, but not treated as generic historical reports.
- Publication and amendment flows should show what members will see before staff publishes.

## Phase 3 Epic 5 Validation

The Operations Center now includes an Operations handoff rail that summarizes the main persona-to-persona transfer points. Deployment setup checklists collapse after substantial completion so the next action remains dominant.
