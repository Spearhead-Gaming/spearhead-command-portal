# Phase 3 UX Simplification Roadmap

## Goal

Reduce cognitive load across the Spearhead Command Portal without removing working functionality or weakening the service-layer architecture.

Phase 3 should make the portal answer:

1. What is this page for?
2. What needs attention?
3. What action should I take next?
4. Where are secondary details?

## Readiness Assessment

The application is ready to begin Phase 3 Epic 1 after the audit because:

- Core routes exist.
- Shared shell and layout components exist.
- Inspector drawer and progressive disclosure patterns exist.
- Service layers are established.
- Permissions are broadly implemented.
- Documentation now identifies UX risks and priorities.

Remaining prerequisite for implementation:

- Use a seeded local database for browser click-through and responsive screenshots before changing high-risk pages.

## Epic Order

1. Global Layout Simplification.
2. Information Hierarchy.
3. Operations Workflow Polish.
4. Workflow Simplification.
5. Persona-Based UX.
6. Personnel & Training Workflow Polish.
7. Design Consistency Audit.
8. Usability Testing & Cleanup.

## Epic 1 Completion Notes

Epic 1 established the canonical navigation shell and route compatibility layer:

- Communications moved out of Administration in visible navigation.
- Developer Tools became a separate permission-restricted group.
- Hard-coded unit links were removed from global navigation.
- Deployments became the canonical visible route at `/operations/deployments`.
- Legacy `/operations/campaigns` routes redirect safely and preserve query strings.
- Mobile navigation, command palette, and inspector drawer gained focus trapping
  and focus restoration.
- Page container variants and shell standards were documented for later epics.

## Epic 2 Completion Notes

Epic 2 established the shared information hierarchy language and applied a first decongestion pass to priority pages:

- Added standards for information hierarchy, dashboard content, tables/lists, cards, filters, progressive disclosure, and empty/loading/error states.
- Added shared progressive-disclosure primitives for Needs Attention, compact metrics, advanced filters, activity previews, inspector summaries, inline issues, status summaries, and detail tabs.
- Dashboard now uses the canonical Needs Attention pattern while keeping secondary analytics collapsed.
- Communications Center now prioritizes failed/pending/scheduled work and collapses history, templates, preferences, and diagnostics.
- Community Management now prioritizes critical cases, unassigned cases, and appeals while collapsing health indicators and moderation history.
- Discord Administration now surfaces delivery, identity, webhook, and gateway issues in Needs Attention while collapsing gateway handler/event diagnostics.
- Events list uses a more compact default table by keeping document, RSVP, and attendance details secondary at narrower widths.
- Deployment filters use the shared advanced-filter pattern.

## Epic 3 Completion Notes

Epic 3 added guided execution scaffolding to Operations workflows without changing doctrine or domain services:

- Added an Operations Package journey builder derived from existing package, readiness, release, and intent data.
- Added reusable workflow components for progress, next actions, blockers, checklists, context, transition shortcuts, save state, and handoff summaries.
- Deployment detail now shows a calculated setup checklist and next recommended action.
- Operations Package now shows current context, next action, blockers, progress, readiness/publish shortcuts, and next-week handoff context.
- Patrol Command now shows current context, next action, and Needs Attention for running patrols, AAR submission, and AAR review.
- No schema changes or persisted checklist state were introduced.

## Epic 4 Completion Notes

Epic 4 introduced persona-based workspaces as a presentation layer over the existing permission system:

- Added deterministic persona resolution for member, patrol leader, unit leadership, S1, S3, deployment creator, Zeus, training, command, community manager, administrator, and developer experiences.
- Added a compact workspace switcher with Automatic mode for multi-persona users.
- Added workspace-aware navigation emphasis without exposing unauthorized routes.
- Added persona dashboard profiles, workspace-specific top KPI priorities, persona quick actions, and a My Work queue.
- Stored explicit workspace choice in an HTTP-only cookie instead of adding new schema.
- Kept route guards and permission helpers authoritative.

## Epic 5 Completion Notes

Epic 5 performed final Operations workflow polish without changing the domain model:

- Operations Center now uses canonical labeling and prioritizes current context, pending actions, handoffs, readiness, and upcoming work.
- Added the reusable `OperationsHandoffRail` to make S3, Zeus, patrol, member, and command handoffs explicit.
- Collapsed secondary Operations diagnostics, personnel readiness signals, and long deployment timelines by default.
- Deployment detail now collapses the setup checklist after substantial completion while preserving the calculated checklist state.
- My Work includes package review and approved-but-unpublished operation prompts for Operations personas.
- Added final Operations UX and handoff documentation.

## Epic 6 Completion Notes

Epic 6 performed final Personnel, Qualifications, Attendance, and Training workflow polish without changing the domain model:

- Personnel Center now shows a service-derived next action and a cross-persona personnel handoff path.
- Rule engine findings are secondary and collapsed so readiness explanations remain available without dominating the center.
- Member profiles now show a profile next action derived from existing readiness, assignment, qualification, and attendance summaries.
- Roster management keeps unit, position, and status actions primary while optional rank is collapsed.
- Unit dashboards now show a unit next action and collapse deployment participation and billet detail behind progressive disclosure.
- Qualification catalog and matrix filters are collapsed by default unless active filters are applied.
- Attendance reporting filters are collapsed by default and tables are more responsive.
- My Work now includes training signoffs, low attendance, unit readiness, and personnel submission prompts.
- Added final Personnel UX and workflow documentation.

## Epic 7 Completion Notes

Epic 7 standardized the reusable design system without changing workflow behavior:

- Added explicit standards for tokens, typography, spacing, actions, cards, forms, badges, alerts, drawers, timelines, uploads, responsiveness, accessibility, and component migration.
- Expanded canonical button variants to cover destructive, warning, success, and link actions.
- Added `ActionGroup` and `SectionHeader` layout primitives for consistent wrapping and hierarchy.
- Added `CompactList` for dense queues and mobile-friendly list fallbacks.
- Migrated representative Personnel and Unit action/list areas to the canonical primitives.
- Documented remaining migration targets for Epic 8 validation and click-through cleanup.

## Epic 8 Completion Notes

Epic 8 prepared the portal for structured user acceptance testing:

- Inventoried all current application routes and matched them against the production build route manifest.
- Created the final Phase 3 validation report, route validation matrix, defect backlog, UAT plan, release-readiness checklist, accessibility report, responsive validation plan, workflow step count report, and security/permission validation report.
- Patched high-visibility terminology leftovers from Mission/Campaign wording to Operation/Deployment wording where user-facing.
- Confirmed lint, typecheck, and production build pass.
- Marked seeded browser, external Discord, file upload/download, and persona permission checks as required UAT evidence instead of claiming unexecuted validation.

## Phase 3 Principles

- Reduce default visible information.
- Keep secondary details accessible.
- Prefer drawers and tabs for inspection.
- Prefer dedicated workflow pages for complex planning.
- Keep services authoritative.
- Do not authorize by role name.
- Do not hard-code units, routes, or Discord channels.
- Preserve audit and historical data.

## Success Metrics

- No primary action silently does nothing.
- No primary action routes to 404.
- Major dashboards show no more than five primary KPIs by default.
- Major tables have compact default columns.
- Operations users can find current week/package/publish actions without route guessing.
- Members can find next event, mod preset, requests, and profile state quickly.
- Admin users can distinguish configuration, diagnostics, and operational moderation.
- Mobile layouts remain usable without horizontal table dependence.

## Source Documents

- [Phase 3 UX Complexity Audit](../08-specifications/PHASE_3_UX_COMPLEXITY_AUDIT.md)
- [Phase 3 Workflow Inventory](../08-specifications/PHASE_3_WORKFLOW_INVENTORY.md)
- [Phase 3 Persona UX Matrix](../08-specifications/PHASE_3_PERSONA_UX_MATRIX.md)
- [Phase 3 Backlog](../08-specifications/PHASE_3_BACKLOG.md)
- [Canonical Terminology](../02-ui/CANONICAL_TERMINOLOGY.md)
