# Operations Final UX Specification

Phase 3 Epic 5 locks the Operations workflow into a calmer, persona-aware command experience. This pass does not add doctrine or major capabilities; it clarifies what is visible first and where secondary detail lives.

## Default Information Hierarchy

Operations pages should answer three questions immediately:

- What deployment, operational week, or package am I looking at?
- What needs attention before the next operation cycle?
- What is the next safe action for my role?

Primary surfaces should keep these visible by default:

- Current deployment or operational week context.
- Next recommended action.
- Needs attention queue.
- Upcoming operation or patrol.
- Publish/readiness blockers when present.

Secondary surfaces should be collapsed, tabbed, or moved into detail views:

- Widget registry diagnostics.
- Full deployment timeline history.
- Personnel readiness details that are not direct package blockers.
- Dense checklist history after setup is substantially complete.
- Release and amendment history unless the current release is blocked.

## Persona Rules

- Community members should see operation readiness, resources, RSVP state, current mod preset, and only the tasking context required to prepare.
- Patrol leaders should see active patrol state, screenshot/AAR requirements, and the direct path to submit or review patrol AARs.
- Zeus and deployment creators should see package readiness, CONOP/resource completeness, tasking status, and progression recommendations before publication.
- S3 should see review queues, package readiness, publication blockers, AAR progression notes, and week-to-week handoff state.
- Command should see health, intent alignment, progression recommendations, failed delivery signals, and decision-ready summaries.

## Components

The reusable Operations workflow components own the shared final-polish language:

- `NextActionCard` keeps the next role-owned action visible.
- `CompletionChecklist` shows calculated progress without storing duplicate checklist state.
- `OperationsHandoffRail` summarizes cross-persona context transfer.
- `HandoffSummary` carries AAR/progression notes into future planning.
- `ContextHeader` keeps deployment, week, operation, package, and publication context aligned.

## Responsive Behavior

On smaller screens, Operations pages should prefer one column, visible next action, compact context cards, and collapsed secondary diagnostics. Primary actions must remain reachable before long timelines or activity feeds.

## Accessibility

Operations actions should be real links or buttons, labels should describe the destination, and collapsed sections must use native disclosure semantics where practical.
