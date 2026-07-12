# Phase 3 Persona UX Matrix

## Persona Matrix

| Persona | Primary Responsibilities | Most Common Tasks | Required Pages | Unnecessary Pages | Current Friction | Ideal Dashboard | Primary Actions | Suggested Navigation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Community Member | Attend events, submit forms, view profile | RSVP, view This Week, submit LOA/transfer, view quals | Dashboard, My Profile, This Week, Applications, Documents | Admin, Builder, Discord diagnostics, broad readiness centers | Too much command/admin language if permissions broaden | Next event, my readiness, my requests, current mod preset | RSVP, submit request, view operation | My Portal, This Week, Applications |
| Patrol Leader | Start patrols, complete patrols, submit AARs | Start patrol, mark complete, submit AAR/screenshot | Patrols, This Week, AAR submission, Dashboard | Discord admin, role builder, broad personnel admin | Patrol and weekend operation concepts can blur | Active patrols, pending AAR, current deployment context | Start Patrol, Complete, Submit AAR | Operations -> Patrols |
| Unit Leadership | Track unit readiness and roster | Inspect roster, missing quals, attendance issues, upcoming ops | Unit Dashboard, Roster, Qualification Matrix, Attendance, This Week | Builder, system settings, full Discord diagnostics | Unit view shows many categories at once | Unit strength, needs attention, upcoming, roster preview | Inspect member, assign position, view missing quals | Personnel, Units, Training |
| S1 / Personnel Staff | Maintain member records | Create/edit profile, assign unit/position, status changes, review transfers | Personnel Center, Members, Roster, Applications/Submissions, Audit | S3-specific package details, Discord gateway internals | Roster/profile/unit readiness duplicate data | Personnel changes, unassigned profiles, pending transfers | Create Member, Assign Unit, Change Status | Personnel workspace |
| S3 / Operations Staff | Plan and publish operations | Create deployment, build package, assign Zeus, publish, review AARs | Operations Center, Deployments, Package, S3, AAR Queue, Patrols | Role builder, personnel deep admin | Too many operations entry points | Current week readiness, blockers, AAR intel, next publish | Open Package, Publish, Review AAR | Operations workspace |
| Deployment Creator | Own deployment progression | Create deployment, review AAR progression, adjust next week | Deployments, Package, AAR Queue, Commander's Intent | General admin, role sync | AAR progression data spread across pages | Deployment health, next decision, current week status | Decide next version, update intent | Deployments + AAR Queue |
| Zeus | Prepare/run operation support | View assigned operation, confirm resources, read CONOP | This Week, Package resources, Zeus | Personnel admin, Discord settings | Zeus page separated from package context | Assigned operation, required resources, mod preset | Confirm assignment, open resources | Operations -> Zeus/My Assignments |
| Training Staff | Manage quals and requirements | Award/revoke quals, update requirements, inspect matrix | Qualification Matrix, Qualifications Catalog, Unit pages | S3 planning, Discord gateway, builder | Catalog vs member record actions can blur | Missing required quals, pending signoffs, unit gaps | Award Qualification, Manage Requirement | Training workspace |
| Command Staff | Monitor readiness and decisions | View operational health, personnel risks, major blockers | Dashboard, Operations Center, Personnel Center, Community Management | Detailed form builders, raw delivery logs | Too many raw details before decisions | Needs attention, command decisions, health trends | Review Decision, Open Blocker | Command Dashboard |
| Community Manager | Manage cases, moderation, communication | Case triage, moderation actions, announcements | Community Management, Communications, Discord moderation history | S3 package internals, qualification matrix | Moderation split across Community and Discord admin | Critical cases, awaiting assignment, recent actions | Create Case, Execute Action | Community workspace |
| Administrator | System configuration and access | Users, roles, permissions, Discord, audit, settings | Administration, Users, Roles, Discord, Audit, Notifications | Member-facing dashboards as primary home | Dense admin pages with too many controls | System health, access issues, failed delivery, recent audit | Create Role, Assign Access, Fix Discord | Administration workspace |
| Developer | Maintain platform foundations | Builder, settings, diagnostics, runbooks | Builder, System Settings, Discord diagnostics, Audit | Daily member/task pages | Builder tools mixed with admin tools | Build status, config warnings, diagnostics | Open Builder, View Logs | Developer Tools |

## Persona-Based Simplification Rules

- Normal members should not see administration, builder, raw Discord diagnostics, or broad personnel management.
- Patrol leaders need a short patrol lifecycle path, not the full S3 planning workspace.
- Unit leadership needs unit readiness and member inspection, not global admin controls.
- S3 needs Operations Center and package workflow first; deployment history and diagnostics second.
- Administrators need system attention first, not every possible admin form.
- Developers can have their own grouped tools so builder foundations do not distract operational admins.

## Suggested Home Experiences

| Persona | Home Experience |
| --- | --- |
| Community Member | My Portal: next event, RSVP, current mod preset, active requests |
| Patrol Leader | Patrol command card: start patrol, active patrol, pending AAR |
| Unit Leadership | Unit command card: strength, missing quals, attendance risks |
| S1 | Personnel queue: profile changes, unassigned, transfers, LOA |
| S3 | Operations queue: package readiness, publish blockers, AAR intel |
| Command Staff | Command dashboard: critical blockers and decisions |
| Community Manager | Case queue and communication needs |
| Administrator | System health and access management |

## Persona Navigation Recommendations

- Add persona-aware dashboard widget profiles.
- Keep permission checks authoritative, but do not rely on permissions alone to shape navigation.
- Add "My Portal" as a member-friendly grouping.
- Move Communications out of Administration.
- Move Builder/System Settings into Developer Tools.
- Keep Operations focused on Deployments, This Week, Patrols, AAR Queue, and Operations Center.

## Phase 3 Epic 4 Implementation Notes

Implemented:

- `PersonaResolver` derives applicable personas from permission keys and linked portal context.
- Workspace selection is validated server-side and persisted as an HTTP-only cookie.
- `Automatic` workspace mode follows the resolver's primary persona recommendation.
- App Shell receives the resolved workspace profile before client hydration.
- Sidebar navigation is still permission-filtered first, then reordered by selected workspace relevance.
- Dashboard top KPI cards, header copy, quick actions, and My Work now adapt to selected workspace.
- Developer workspace remains hidden unless explicit builder/developer diagnostic permissions apply.

Not implemented in Epic 4:

- Persisted per-widget user layout preferences.
- Persona-aware global search ranking.
- Full per-entity persona detail-depth rendering.
- Dismissible first-use onboarding callouts.

## Phase 3 Epic 5 Operations Persona Validation

- Community Member: Operations surfaces keep member-facing preparation separate from S3 diagnostics; published package details remain the member source of truth.
- Patrol Leader: Patrol and AAR queues stay visible in Operations attention areas without forcing patrol leaders into full package planning.
- Unit Leadership: Personnel readiness signals remain available, but they no longer dominate the Operations Center unless they are actionable.
- S3 / Operations Staff: Operations Center now emphasizes package state, review queues, publication blockers, and handoff ownership.
- Deployment Creator: Deployment setup preserves the full checklist but collapses it after substantial completion so progression and next action are easier to find.
- Zeus: The handoff rail explicitly calls out Zeus receiving CONOP, resources, mod preset, and operation version context before publication.
- Command Staff: Progression recommendations, health, intent alignment, and critical issues remain decision-facing while raw timelines are secondary.

## Phase 3 Epic 6 Personnel Persona Validation

- Community Member: Member identity remains Discord display-name first, with profile/readiness context visible and restricted staff notes protected.
- Unit Leadership: Unit dashboards now show a unit-scoped next action before secondary deployment and billet detail.
- S1 / Personnel Staff: Personnel Center now exposes the next action and handoff path before rule diagnostics and history.
- Training Staff: Pending signoffs and missing/expiring qualifications surface through My Work, catalog, and matrix entry points.
- Command Staff: Unit readiness, low attendance, qualification gaps, and personnel submissions are routed as summary-first signals.
- Administrator: Identity and access concerns remain in admin/Discord areas while Personnel workflows own roster, assignment, status, LOA, and transfer context.
