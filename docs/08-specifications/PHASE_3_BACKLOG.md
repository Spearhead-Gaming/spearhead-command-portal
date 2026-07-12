# Phase 3 UX Simplification Backlog

## Epic 1 - Global Layout Simplification

### 1. Persona-Aware Navigation Groups

- Problem: Permission-aware navigation still exposes too many routes to privileged users.
- Affected routes: all authenticated routes.
- Personas: all, especially admin/S3/command.
- Proposed solution: Add persona/task grouping and collapse low-frequency tools.
- Priority: P0.
- Effort: Medium.
- Dependencies: Persona matrix.
- Risk: Medium.
- Acceptance criteria: Sidebar shows fewer top-level groups; admin/developer tools are separated; no permission bypass.
- Epic 1 status: Implemented for global navigation. Further persona-specific dashboard routing remains future work.

### 2. Operations Navigation Cleanup

- Problem: Deployments and Planning Packages point to the same route; S3/Operations/Weekly Tasking overlap.
- Affected routes: `/operations`, `/operations/campaigns`, `/operations/s3`, `/operations/weekly-tasking`.
- Personas: S3, command, deployment creator.
- Proposed solution: Establish Operations Center, Deployments, This Week, Patrols, AAR Queue as primary nav.
- Priority: P0.
- Effort: Small.
- Dependencies: Canonical terminology.
- Risk: Low.
- Acceptance criteria: No duplicate sidebar destination; labels match doctrine.
- Epic 1 status: Implemented in visible navigation. Legacy campaign URLs redirect to deployment routes.

### 3. Developer Tools Group

- Problem: Builder and system settings distract operational admins.
- Affected routes: `/administration/builder/*`, `/administration/settings`.
- Personas: admin, developer.
- Proposed solution: Move to Developer Tools group gated by builder/developer permissions.
- Priority: P1.
- Effort: Small.
- Dependencies: navigation update.
- Risk: Low.
- Acceptance criteria: Builder routes remain reachable only to intended users.
- Epic 1 status: Implemented as a separate Developer Tools navigation group.

## Epic 2 - Information Hierarchy

### 4. Dashboard Visible Widget Limits

- Problem: Dashboards show too many equal-priority widgets.
- Affected routes: `/dashboard`, `/operations`, `/personnel`, `/units/[unitId]`.
- Personas: all.
- Proposed solution: Enforce primary KPI row of 3 to 5 cards plus Needs Attention, Upcoming, Recent Activity.
- Priority: P0.
- Effort: Medium.
- Dependencies: dashboard service summaries.
- Risk: Medium.
- Acceptance criteria: Default dashboard has one clear primary action and no more than five visible KPIs.
- Epic 2 status: Implemented for the command dashboard with a primary KPI row, canonical Needs Attention, Upcoming, Recent Activity, and collapsed secondary analytics.

### 5. Secondary Analytics Collapsible Standard

- Problem: Analytics and diagnostics compete with task cards.
- Affected routes: dashboards, unit pages, Discord admin.
- Personas: leaders/admins.
- Proposed solution: Use `CollapsibleSection` for secondary analytics by default.
- Priority: P1.
- Effort: Medium.
- Dependencies: canonical components.
- Risk: Low.
- Acceptance criteria: Secondary analytics are accessible but collapsed unless urgent.
- Epic 2 status: Shared progressive-disclosure primitives were expanded. Communications history, templates, preferences, diagnostics, Community Management health/history, Discord gateway diagnostics, and Events supporting context now use collapsed sections where appropriate.

### 6. Attention Panel Standard

- Problem: Needs-attention signals are inconsistent.
- Affected routes: dashboard, operations, personnel, community, communications.
- Personas: all staff.
- Proposed solution: Canonical `AttentionPanel` with one action per item.
- Priority: P0.
- Effort: Medium.
- Dependencies: service-level attention summaries.
- Risk: Low.
- Acceptance criteria: Major dashboards use consistent attention panels.
- Epic 2 status: `NeedsAttention` was added as the canonical actionable-problem pattern and applied to Dashboard, Communications, Community Management, and Discord Administration.

## Epic 3 - Workflow Simplification

### 7. Operations Package Guided Checklist

- Problem: Package planning has too many sections at once.
- Affected routes: `/operations/packages/[campaignId]/week/[weekNumber]`.
- Personas: S3, Zeus, command.
- Proposed solution: Stage rail: Planning, Tasking, Resources, Readiness, Publish, Monitor.
- Priority: P0.
- Effort: Large.
- Dependencies: OperationsPackageService.
- Risk: Medium.
- Acceptance criteria: Users can identify current stage, blockers, and next action.
- Epic 3 status: Initial guided package journey implemented with context, next action, blockers, progress, checklist, release shortcuts, and handoff summary. Full stage rail/wizard remains future polish.

### 8. Patrol Lifecycle Fast Path

- Problem: Start, complete, AAR, and screenshot steps are separated.
- Affected routes: `/operations/patrols`, `/operations/aars`, Discord patrol commands.
- Personas: patrol leaders, S3.
- Proposed solution: Active patrol card with Complete and Submit AAR next-action prompts.
- Priority: P0.
- Effort: Medium.
- Dependencies: patrol/AAR services.
- Risk: Medium.
- Acceptance criteria: Patrol leader can complete and submit AAR without searching multiple pages.
- Epic 3 status: Patrol Command now shows context, next action, and attention queue for active patrols, AAR submission, and AAR review. Full guided AAR submission wizard remains future work.

### 9. Attendance Event Tab Model

- Problem: RSVP, final attendance, override, lock, and reporting compete.
- Affected routes: `/operations/events/[id]`, `/operations/attendance`.
- Personas: staff, unit leaders.
- Proposed solution: Event detail tabs: Overview, RSVP, Attendance, Discord, Audit.
- Priority: P1.
- Effort: Medium.
- Dependencies: existing event service.
- Risk: Medium.
- Acceptance criteria: Attendance editing is contextual and bulk actions are obvious.

## Epic 5 - Operations Final Polish

### 16. Operations Center Hierarchy Pass

- Problem: Operations Center exposed command data, readiness, diagnostics, activity, and timeline at the same visual weight.
- Affected routes: `/operations`.
- Personas: S3, deployment creator, Zeus, command.
- Proposed solution: Keep current context, next action, needs attention, handoff path, and upcoming work visible; collapse secondary diagnostics and long timeline history.
- Priority: P0.
- Effort: Small.
- Dependencies: Operations Package journey, persona workspaces.
- Risk: Low.
- Acceptance criteria: S3 can identify the current package, blockers, next handoff, and publish/readiness state without scanning diagnostic panels.
- Epic 5 status: Implemented with the Operations handoff rail, collapsed widget diagnostics, collapsed personnel readiness signals, and collapsed deployment timeline.

### 17. Deployment Setup Checklist Noise Reduction

- Problem: Deployment setup checklist remains visually dominant after the setup path is mostly complete.
- Affected routes: `/operations/deployments/[id]`.
- Personas: deployment creator, S3.
- Proposed solution: Keep next action visible and collapse setup checklist review once substantial setup is complete.
- Priority: P1.
- Effort: Small.
- Dependencies: shared workflow checklist.
- Risk: Low.
- Acceptance criteria: Deployment detail prioritizes current next action and summary metrics while preserving checklist history.
- Epic 5 status: Implemented with a collapsible setup checklist review when setup is at least 80 percent complete.

## Epic 4 - Persona-Based UX

### 10. My Portal Member Home

- Problem: Member dashboard can feel command-staff oriented.
- Affected routes: `/dashboard`, future `/me` if added.
- Personas: community member.
- Proposed solution: Member-focused home view with next event, current mod preset, requests, quals.
- Priority: P1.
- Effort: Medium.
- Dependencies: dashboard service.
- Risk: Low.
- Acceptance criteria: Member sees only personally relevant tasks by default.

### 11. S1 Personnel Queue

- Problem: S1 work is spread across members, roster, applications, units.
- Affected routes: `/personnel`, `/personnel/members`, `/personnel/roster`, `/administration/submissions`.
- Personas: S1.
- Proposed solution: Queue cards for unassigned profiles, transfers, LOA, status changes.
- Priority: P1.
- Effort: Medium.
- Dependencies: forms/personnel services.
- Risk: Medium.
- Acceptance criteria: S1 has one obvious next queue.

### 12. Community Manager Case Home

- Problem: Community and Discord moderation ownership is split.
- Affected routes: `/community-management`, `/administration/discord`.
- Personas: community manager.
- Proposed solution: Community Management becomes case queue; Discord admin keeps integration diagnostics.
- Priority: P2.
- Effort: Medium.
- Dependencies: case service maturity.
- Risk: Medium.
- Acceptance criteria: Moderation actions are launched from cases, not diagnostics.

### Epic 4 Implementation Status

- PersonaResolver and workspace profiles: Implemented.
- Workspace switcher with Automatic mode: Implemented.
- Persona-aware navigation emphasis: Implemented.
- Persona dashboard header, KPI row, quick actions, and My Work: Implemented.
- Persisted database-backed persona preferences: Deferred; HTTP-only cookie is sufficient for current explicit workspace selection.
- Persona-aware global search ranking: Deferred to a later polish epic.

## Epic 5 - Operations Workflow Polish

### 13. Deployment Route Terminology Plan

- Problem: Deployment UI lives under campaign URLs.
- Affected routes: `/operations/deployments`, `/operations/deployments/[id]`, legacy `/operations/campaigns`, legacy `/operations/campaigns/[id]`.
- Personas: S3, command.
- Proposed solution: Add `/operations/deployments` route aliases/redirects before broad model rename.
- Priority: P1.
- Effort: Medium.
- Dependencies: route-safe constants.
- Risk: Medium.
- Acceptance criteria: Users see deployment terminology; legacy links continue to work.
- Epic 1 status: Implemented canonical deployment routes and legacy campaign redirects.

## Epic 6 - Personnel and Training Workflow Polish

### 18. Personnel Center Next Action

- Problem: Personnel Center contains the right data but can still make users scan multiple queues before acting.
- Affected routes: `/personnel`.
- Personas: S1, unit leadership, training, command.
- Proposed solution: Add service-derived next action and cross-persona handoff path.
- Priority: P0.
- Effort: Small.
- Dependencies: Personnel center service, persona workspaces.
- Risk: Low.
- Acceptance criteria: Personnel Center exposes the next responsible action before diagnostics/history.
- Epic 6 status: Implemented with `PersonnelNextActionCard` and `PersonnelHandoffRail`.

### 19. Personnel Detail Progressive Disclosure

- Problem: Member, roster, unit, qualification, and attendance pages still show some secondary controls too early.
- Affected routes: `/personnel/members`, `/personnel/roster`, `/personnel/members/[id]`, `/units/[unitId]`, `/personnel/qualifications`, `/training/qualification-matrix`, `/operations/attendance`.
- Personas: all Personnel and Training personas.
- Proposed solution: Collapse optional rank, filters, secondary unit detail, matrix filters, attendance filters, and diagnostics by default.
- Priority: P0.
- Effort: Medium.
- Dependencies: shared progressive-disclosure components.
- Risk: Low.
- Acceptance criteria: Primary context, status, issue, and action remain visible; secondary detail remains accessible.
- Epic 6 status: Implemented.

### 14. AAR Progression Decision Panel

- Problem: AARs are historical and decision inputs, but progression decision fields can be buried.
- Affected routes: `/operations/aar-queue`, deployment detail, package page.
- Personas: S3, deployment creator.
- Proposed solution: Dedicated review panel with recommendation, next version, issues, unit notes.
- Priority: P0.
- Effort: Medium.
- Dependencies: AAR progression fields.
- Risk: Medium.
- Acceptance criteria: Reviewed AAR produces visible next-week planning context.
- Epic 3 status: Operations Package now includes a handoff summary surfacing intent state, progression signal, and next planning action. Full AAR progression decision panel remains future work.

### 15. This Week Member View

- Problem: Member-facing weekly operation information is scattered.
- Affected routes: `/operations/this-week`, `/dashboard`.
- Personas: members, Zeus, leaders.
- Proposed solution: One member-friendly current operation page with tasking, CONOP, mod preset, RSVP.
- Priority: P1.
- Effort: Medium.
- Dependencies: operations package release data.
- Risk: Medium.
- Acceptance criteria: Members can answer "what do I need for this weekend?" in one page.

## Epic 6 - Personnel & Training Workflow Polish

### 16. Compact Roster Defaults

- Problem: Roster can become a dense management table.
- Affected routes: `/personnel/roster`, `/units/[unitId]`.
- Personas: S1, unit leadership.
- Proposed solution: Default columns: member, unit/position, status, readiness flag, action.
- Priority: P0.
- Effort: Small.
- Dependencies: member inspector.
- Risk: Low.
- Acceptance criteria: Secondary details move to drawer; mobile table is usable.

### 17. Qualification Matrix Scope Defaults

- Problem: Matrix is inherently dense.
- Affected routes: `/training/qualification-matrix`.
- Personas: training staff, unit leaders.
- Proposed solution: Default to unit/category scope and hide advanced filters.
- Priority: P1.
- Effort: Medium.
- Dependencies: filter component.
- Risk: Medium.
- Acceptance criteria: Initial matrix is readable without horizontal overload.

### 18. Member Service Record Tabs

- Problem: Service record can become a data dump.
- Affected routes: `/personnel/members/[id]`, member inspector.
- Personas: S1, member, leaders.
- Proposed solution: Overview first; qualifications, attendance, campaigns, notes, audit in tabs.
- Priority: P1.
- Effort: Medium.
- Dependencies: permission-aware sections.
- Risk: Low.
- Acceptance criteria: Overview answers status, readiness, unit, next action.

## Epic 7 - Design Consistency Audit

### 19. Canonical Filter/Search Components

- Problem: duplicate filter/search components exist.
- Affected routes: all table/list pages.
- Personas: all.
- Proposed solution: Choose one filter bar and one search input pattern.
- Priority: P1.
- Effort: Small.
- Dependencies: component audit.
- Risk: Low.
- Acceptance criteria: No duplicate imports for same pattern in new code.

### 20. Drawer Accessibility Upgrade

- Problem: Inspector drawer lacks full focus trap and focus restoration.
- Affected routes: all drawer users.
- Personas: keyboard/screen-reader users.
- Proposed solution: Add focus trap, return focus, standard widths.
- Priority: P0.
- Effort: Medium.
- Dependencies: drawer component.
- Risk: Medium.
- Acceptance criteria: Escape, tab containment, close, and focus restore work consistently.
- Epic 1 status: Implemented for mobile navigation, command palette, and inspector drawer shells. Additional custom modals should migrate to the same standard later.

### 21. Placeholder Action Standard

- Problem: Some placeholders look functional.
- Affected routes: command palette, builder, disabled actions.
- Personas: all.
- Proposed solution: Standard disabled/coming-soon action copy and tooltip.
- Priority: P1.
- Effort: Small.
- Dependencies: shared action component.
- Risk: Low.
- Acceptance criteria: No visible action silently does nothing.

## Epic 8 - Usability Testing & Cleanup

### Epic 7 status

Design consistency foundation is in place. Epic 8 should validate the standards through screenshot review, click-through testing, and targeted migration of remaining dense lists and custom action rows.

### 22. Responsive Screenshot Pass

- Problem: Responsive risks are inferred but not fully screenshot-validated.
- Affected routes: high/critical pages.
- Personas: all mobile/tablet users.
- Proposed solution: Capture 1440, 1280, 1024, 768, 390px screenshots for priority routes.
- Priority: P0.
- Effort: Medium.
- Dependencies: stable dev environment.
- Risk: Low.
- Acceptance criteria: Screenshot findings produce actionable tickets.

### 23. Click-Through Action Audit

- Problem: Broad app contains many visible actions.
- Affected routes: all.
- Personas: all.
- Proposed solution: Browser click-through audit primary/secondary actions.
- Priority: P0.
- Effort: Medium.
- Dependencies: seeded local DB.
- Risk: Low.
- Acceptance criteria: No visible primary action 404s or silently does nothing.

### 24. Terminology Implementation Pass

- Problem: Campaign/deployment and mission/operation terminology remain mixed.
- Affected routes: operations, docs, navigation.
- Personas: all operations users.
- Proposed solution: Apply canonical terminology table with redirects/aliases where needed.
- Priority: P1.
- Effort: Large.
- Dependencies: route alias strategy.
- Risk: Medium.
- Acceptance criteria: UI labels use canonical terms while legacy URLs remain safe.
- Epic 8 status: High-visibility Dashboard, Member Inspector, and S3 Operations copy was patched. Internal compatibility symbols and historical docs may still use Campaign/Mission when referring to database models, permission keys, or legacy route aliases.
