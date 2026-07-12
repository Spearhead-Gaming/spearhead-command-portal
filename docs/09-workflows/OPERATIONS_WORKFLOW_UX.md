# Operations Workflow UX

## Purpose

Phase 3 Epic 3 makes Operations workflows guided without changing doctrine or replacing domain services.

Operations users should always understand:

- Current Deployment
- Current Operational Week
- Weekend Operation
- Operations Package status
- Publish/release status
- Next recommended action
- Blocking issues

## Current vs Simplified Flow

| Workflow | Previous Step Count | Simplified Step Count | Change |
| --- | ---: | ---: | --- |
| Create Deployment to Week 1 planning | 5 to 7 | 3 to 5 | Deployment detail now exposes setup checklist and next action. |
| Build Operations Package | 8 to 14 | 5 to 8 | Package page now shows context, next action, blockers, journey progress, and direct section links. |
| Review readiness to publish | 5 to 8 | 3 to 5 | Readiness, preview, publish, and release history are presented in one package flow. |
| Patrol lifecycle | 5 to 8 | 3 to 5 | Patrol page now shows context, next action, and attention queue before lifecycle cards. |
| AAR review to progression | 5 to 9 | 4 to 6 | AAR follow-up is surfaced as a first-class Patrol/S3 next action. |

## Implementation Decisions

- The Portal remains the source of truth.
- No new persisted checklist state is stored.
- Workflow steps are derived from existing Deployment, Operations Package, readiness, release, Patrol, and AAR data.
- Staff can still work out of order when permissions and existing services allow it.
- Guided next actions do not replace permission checks or service validation.
