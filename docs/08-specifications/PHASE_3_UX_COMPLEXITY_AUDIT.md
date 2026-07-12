# Phase 3 UX Complexity Audit

## Executive Summary

The portal has reached broad functional coverage: personnel, operations, deployments, patrols, AARs, applications, communications, community management, Discord automation, rule providers, dashboards, and administration are all represented. The main Phase 3 risk is no longer missing capability. The risk is that too many capabilities are visible at once, with equal visual weight, and with overlapping navigation labels.

The current UX is strong in foundational consistency: authenticated pages share `AppShell`, `TopBar`, `SidebarNav`, `PageHeader`, cards, badges, tables, inspector drawers, and progressive disclosure components. The shell uses a stable full-height layout with independently scrolling content. The inspector drawer has fixed viewport containment, internal scrolling, Escape close behavior, and mobile overlay behavior.

The current UX is weak in task hierarchy. Dashboards often mix command summaries, management controls, diagnostics, and historical data on the same page. Administration and Discord pages are particularly dense. Operations has overlapping concepts: Deployments, Campaigns, Planning Packages, Weekly Operations, S3, Operations Center, AAR Queue, CONOPs, Patrols, and This Week all compete for user attention. Personnel similarly has Member list, Roster, Readiness Center, Unit pages, qualification matrix, and member service records with overlapping readiness data.

Phase 3 should not remove capability. It should progressively disclose it.

## Critical UX Risks

| Risk | Evidence | Impact | Phase 3 Direction |
| --- | --- | --- | --- |
| Navigation overload | Sidebar exposes Dashboard, Personnel, Units, Operations, Training, Documents, Applications, Community, Administration, plus many nested items | New users cannot infer their next task | Collapse by persona and task intent |
| Operations terminology overlap | Navigation labels include Deployments, Planning Packages, Campaign routes, This Week, S3, Weekly Tasking, Zeus, CONOPs, AAR Queue | Staff may not know where planning vs publishing vs execution lives | Canonicalize Deployment, Operational Week, Operations Package, Patrol, AAR |
| Dense admin surfaces | Discord Settings, Builder, Roles, Users, Notifications, Communications, Community Management show many controls/cards | Administrators must scan too much before acting | Split summary, attention, configuration, diagnostics |
| Dashboard overreach | Command Dashboard includes global metrics, personal readiness, S3, training, attendance, deployment, admin signals, activity | Dashboard becomes another management page | Persona-specific widget limits |
| Duplicate component vocabulary | `components/data/filter-bar.tsx` and `components/shared/filter-bar.tsx`, shared/status variants, placeholder and real pages coexist | Inconsistent UI behavior and maintenance cost | Canonical component map |
| Hard-coded unit navigation | `src/lib/navigation.ts` exposes fixed unit slugs | Violates dynamic-unit philosophy and creates stale links risk | Replace with All Units plus context shortcuts later |
| Stale/legacy labels | Campaign route backs Deployment UI; sidebar had old milestone copy | Confidence loss and conceptual friction | Terminology pass before redesign |
| Table density | Roster, members, users, audit, notification delivery, Discord sync, forms, attendance can expose too many columns/actions | Mobile and scanability degrade | Compact defaults plus inspector details |

## Route Inventory

| Route | Visible Screen | Domain | Audience | Primary Purpose | Primary Action | Components | Status | Phase 3 Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Root redirect/home | Dashboard/Auth | All | Route users to workspace | Continue to portal | Next route | Complete | Keep |
| `/login` | Login | Auth | Public/member | Discord login | Sign in with Discord | Auth page cards | Complete | Keep |
| `/logout` | Logout | Auth | Authenticated | End session | Sign out | Auth page cards | Complete | Keep |
| `/internal/bootstrap` | Developer bootstrap | Auth/Admin | Developer | Hidden setup access | Login with secret | Auth form | Complete | Hide from nav |
| `/unauthorized` | Unauthorized | Auth | All | Missing auth state | Return/login | Auth empty state | Complete | Keep |
| `/forbidden` | Forbidden | Auth | All | Missing permission | Return | Auth empty state | Complete | Keep |
| `/dashboard` | Command Dashboard | Dashboard | All personas | Role-aware overview | Open next relevant task | KPI cards, widgets, collapsibles | High complexity | Persona-first dashboard |
| `/personnel` | Personnel Readiness Center | Personnel | S1, unit leaders | Personnel/readiness overview | Resolve readiness issue | Cards, rule summaries | High | Make S1 home, hide from normal members |
| `/personnel/members` | Members | Personnel | S1, leaders | Search/manage profiles | Create member/open inspector | Tables, drawer, forms | Moderate | Compact table plus drawer |
| `/personnel/members/[id]` | Member Service Record | Personnel | Staff/member self | Official member profile | Edit profile / next action | Service record, tabs, timeline | Moderate | Keep overview-first |
| `/personnel/roster` | Roster | Personnel | S1, unit leaders | Assignment/status management | Change assignment/status | Table, filters, inspector | High | Reduce default columns |
| `/personnel/qualifications` | Qualifications Catalog | Training | Training staff | Manage qualification catalog | Create/edit qualification | Catalog cards, forms, drawer | Moderate | Separate catalog from record actions |
| `/training/qualification-matrix` | Qualification Matrix | Training | Training staff, leaders | Unit/member qualification readiness | Inspect/award qualification | Matrix/table, filters, drawer | High | Default to unit scope |
| `/training/events` | Training Events | Training | Training staff | Training event view | Create/open event | Placeholder/route page | Low/partial | Merge with Events filter if duplicate |
| `/training/instructors` | Instructors | Training | Training staff | Instructor overview | Review instructors | Placeholder/route page | Low/partial | Keep hidden until workflow exists |
| `/units` | Units | Units | Members/leaders | Unit directory | Open unit | Cards, KPIs | Moderate | Keep |
| `/units/[unitId]` | Unit Dashboard | Units | Unit leaders/members | Unit roster/readiness | Inspect member / view issues | Cards, roster table, readiness | High | Split overview vs management |
| `/operations` | Operations Center | Operations | S3, command | Operational command overview | Open package/issue | Widgets, rules, recommendations | Critical | Make S3 command home |
| `/operations/deployments` | Deployments | Deployments | S3, command | Deployment list and creation | Create deployment | Cards, create drawer, filters | High | Canonical route added in Epic 1 |
| `/operations/deployments/[id]` | Deployment Detail | Deployments | S3, command | Deployment timeline/resources | Open current week | Widgets, resources, docs | High | Canonical route added in Epic 1 |
| `/operations/campaigns` | Legacy redirect | Deployments | S3, command | Preserve old bookmarks | Redirect | Redirect | Complete | Redirects to `/operations/deployments` |
| `/operations/campaigns/[id]` | Legacy redirect | Deployments | S3, command | Preserve old bookmarks | Redirect | Redirect | Complete | Redirects to `/operations/deployments/[id]` |
| `/operations/packages/[campaignId]/week/[weekNumber]` | Operations Package | Operations | S3, Zeus, leaders | Weekly planning package | Update planning/publish | Forms, resources, readiness | Critical | Guided workflow page |
| `/operations/packages/[campaignId]/week/[weekNumber]/releases` | Operations Releases | Operations | S3, command | Release history | Review release | Tables/cards | Moderate | Keep under package |
| `/operations/this-week` | This Week | Operations | Members/leaders | Current weekly operation | RSVP/open package | Summary cards | Moderate | Make member-facing operation page |
| `/operations/weekly-tasking` | Weekly Tasking | Operations | S3/unit leaders | Tasking management | Update tasking | Forms/cards | High | Merge into package workspace |
| `/operations/events` | Events | Operations | Members/staff | Events and RSVP | Create event / RSVP | List/cards, forms | Moderate | Keep, filter by type |
| `/operations/events/[id]` | Event Detail | Operations | Members/staff | RSVP/attendance/event detail | RSVP or record attendance | Detail cards, attendance table | High | Put attendance in tab/drawer |
| `/operations/attendance` | Attendance | Attendance | Staff/leaders | Attendance reporting | Record/filter attendance | Tables, forms | High | Persona-specific summaries |
| `/operations/patrols` | Patrols | Patrols | Patrol leaders/S3 | Start/track patrols | Start patrol | Cards, forms, inspector | High | Optimize start/complete/AAR path |
| `/operations/aars` | AARs | AAR | Patrol leaders/S3 | AAR records | Submit/review AAR | Forms, lists | High | Merge with AAR Queue where possible |
| `/operations/aar-queue` | AAR Queue | AAR/S3 | S3 | Review submitted AARs | Review next AAR | Queue cards/forms | High | Keep as S3 task queue |
| `/operations/conops` | CONOPs | S3/Documents | S3, members | Operation resource links/files | Open CONOP | Lists/cards | Moderate | Treat as package resource view |
| `/operations/s3` | S3 Dashboard | S3 | S3 staff | Planning oversight | Open package/review | Cards, queues | Critical | Merge into Operations Center or make tab |
| `/operations/zeus` | Zeus | S3 | Zeus/S3 | Zeus assignment/status | Assign Zeus | Cards/forms | Moderate | Keep as package subview |
| `/documents` | Documents | Documents | All/staff | Document library | Open/create document | Cards, inspector, forms | Moderate | Keep with categories |
| `/documents/[id]` | Document Detail | Documents | All/staff | Document read/manage | Publish/edit | Detail cards | Moderate | Keep |
| `/applications` | Applications | Forms | Members | Submit/view forms | Open form | Cards, submission list | Moderate | Member-friendly home |
| `/applications/[id]` | Application Detail | Forms | Submitter/staff | Submission detail | Comment/submit | Forms, timeline | Moderate | Keep |
| `/communications` | Communications Center | Communications | Staff/admin | Templates/deliveries | Create communication | Cards, tables | High | Move out of Administration group |
| `/community-management` | Community Management Center | Community | Community managers | Cases/moderation | Open/create case | Cards, lists | High | Make case queue-first |
| `/administration` | Administration Dashboard | Admin | Admin | System overview | Open admin task | Cards/widgets | High | Keep summary-only |
| `/administration/users` | Users | Admin | Admin | User/account management | Inspect/assign role | Table, drawer, forms | High | Compact columns + drawer |
| `/administration/roles` | Roles & Permissions | Admin | Admin | Role builder | Create/edit role | Matrix, drawer | Critical | Split role list and permission matrix |
| `/administration/discord` | Discord Settings | Discord/Admin | Admin/Discord staff | Bot, sync, mappings, diagnostics | Fix failed config | Dense cards/tables/forms | Critical | Split Settings, Sync, Delivery, Diagnostics tabs |
| `/administration/notifications` | Notification Deliveries | Admin | Admin/comms | Review delivery state | Retry placeholder/review | Table/cards | Moderate | Keep as delivery history |
| `/administration/forms` | Form Templates | Forms/Admin | Admin/staff | Build/manage templates | Create template | Forms/cards | High | Guided builder |
| `/administration/forms/[id]` | Form Template Detail | Forms/Admin | Admin/staff | Edit template fields | Add field/preview | Forms/lists | High | Split edit/preview |
| `/administration/submissions` | Submission Review | Forms/Admin | Staff | Review applications/requests | Open next submission | Queue/table/drawer | High | Queue-first |
| `/administration/builder` | Platform Builder | Builder/Admin | Admin/dev | Builder overview | Open builder area | KPI/cards | Moderate | Hide from most admins |
| `/administration/builder/forms` | Builder Forms | Builder/Admin | Admin/dev | Template builder foundation | Create template | Cards/forms | High | Merge with admin forms |
| `/administration/builder/workflows` | Workflow Templates | Builder/Admin | Admin/dev | Workflow config foundation | Create workflow | Forms/cards | Moderate/partial | Hide until needed |
| `/administration/builder/automations` | Automation Rules | Builder/Admin | Admin/dev | Automation config records | Create rule | Forms/cards | Moderate/partial | Hide until runner exists |
| `/administration/builder/dashboards` | Dashboard Layouts | Builder/Admin | Admin/dev | Configurable dashboard layout | Create layout | Forms/cards | Moderate/partial | Hide until consumed |
| `/administration/builder/widgets` | Widget Catalog | Builder/Admin | Admin/dev | Widget definitions | Review widgets | Cards | Low | Read-only catalog |
| `/administration/audit-logs` | Audit Logs | Admin | Admin | Audit history | Filter/view | Table/filters | High | Add advanced filters drawer |
| `/administration/settings` | System Settings | Admin | Admin/dev | System config placeholder | Review settings | Cards/forms | Low/partial | Keep hidden until functional |

## Navigation Findings

- The sidebar is permission-aware, which is good, but it is not persona-aware enough. A highly privileged user sees too much at once.
- Operations has duplicate or overlapping destinations: `Deployments` and `Planning Packages` both point to `/operations/campaigns`; S3, Operations Center, Weekly Tasking, This Week, Zeus, CONOPs, AARs, AAR Queue, and Attendance compete.
- Units navigation hard-codes Spearhead unit slugs. This conflicts with the documented rule to avoid hard-coded unit assumptions.
- Communications is placed inside Administration even though it is an operational staff function.
- Builder tools are exposed as first-class admin routes even though many are foundations/placeholders.
- Campaign route names remain in URLs while UI language has shifted to Deployments.
- Command palette currently communicates placeholder behavior and should not be relied on as primary navigation until actions are real.

## Recommended Navigation Hierarchy

```text
Dashboard
My Portal
  My Profile
  My Applications
  My Events
Operations
  Operations Center
  Deployments
  This Week
  Patrols
  AAR Queue
Personnel
  Readiness Center
  Members
  Roster
  Units
Training
  Qualification Matrix
  Qualification Catalog
Communications
  Communications Center
  Delivery Review
Community
  Case Management
Administration
  Users
  Roles & Permissions
  Discord
  Forms
  Audit Logs
Developer Tools
  Builder
  System Settings
```

## Page Complexity Ratings

| Page Group | Rating | Why |
| --- | --- | --- |
| Command Dashboard | High | Many role-aware widgets, secondary analytics, activity feeds, and personal/admin signals compete |
| Operations Center | Critical | Combines planning, readiness, health, recommendations, release status, and command signals |
| Deployment List/Detail | High | Filters, grouped records, resource model, progress, statistics, documents, timeline |
| Operations Package | Critical | Weekly tasking, unit tasking, resources, CONOP, Zeus, readiness, publish state, releases |
| Patrols/AARs | High | Start, complete, submit AAR, screenshot, review, and Discord workflows converge |
| Personnel Readiness Center | High | Center-level dashboard plus operational management data |
| Member Profile | Moderate | Service-record layout is appropriate but tabs must remain strong |
| Roster | High | Management table can overload with attendance, quals, assignment, status, action columns |
| Unit Dashboard | High | Roster, readiness, attendance, deployment, billets all visible |
| Qualification Matrix | High | Matrix pattern is inherently dense |
| Applications/Submissions | High | Member forms and staff review queues need different mental models |
| Discord Settings | Critical | Bot health, gateway, sync, identity, delivery, role mappings, moderation, commands, logs |
| Roles & Permissions | Critical | Matrix plus assignments plus effective permissions is cognitively heavy |
| Builder Tools | Moderate to High | Mostly admin/developer configuration and not needed by daily operators |

## Dashboard Findings

| Dashboard | Current Issue | Max Initial Visible Set |
| --- | --- | --- |
| Member Dashboard | Can show global/admin widgets when permissions are broad | Next event, my readiness, my applications, latest announcement |
| Unit Dashboard | Mixes unit summary with management details | Strength, needs attention, upcoming, roster preview |
| Operations Center | Too many command/rule/health/recommendation concepts | Current week state, readiness, blockers, next publish action, recent patrol intelligence |
| Personnel Readiness Center | Overlaps roster, unit, qualification, attendance | Personnel changes, unassigned members, readiness blockers, recent profile activity |
| Communications Center | Mixes template/admin/delivery concepts | Drafts needing action, failed deliveries, recent sends, create communication |
| Community Management Center | Needs queue-first prioritization | Critical cases, awaiting assignment, recent decisions, create case |
| Discord Administration | Dense diagnostic surface | Health summary, needs attention, mappings summary, recent failures |
| Administration Dashboard | Should not duplicate every admin page | System attention, user/account issues, audit highlights |

## Table Findings

| Table/List | Recommended Default Columns |
| --- | --- |
| Members | Member/Discord name, unit, status, primary action |
| Roster | Member, unit/position, status, readiness flag, action |
| Unit roster | Member, position, status, action |
| Qualification matrix | Member, required/missing summary, compact qualification cells |
| Events | Title, status, date, type/unit, action |
| Attendance | Member, RSVP, final status, action |
| Patrols | Patrol/callsign, status, leader, time, action |
| AAR Queue | AAR/event, status, submitted by, age, action |
| Applications/Submissions | Applicant, form type, status, reviewer, action |
| Users | User, linked profile, active state, access summary, action |
| Roles | Role, active state, permission count, assignment count, action |
| Discord deliveries | Type, recipient/channel, status, last error, action |
| Audit logs | Time, actor, action, entity, action |

## Form Findings

- Create Deployment should remain a drawer or focused page, not a small modal, because it seeds a long-running operational structure.
- Start Patrol should be a compact action form with strong defaults inherited from the active deployment/week.
- Patrol AAR should be a guided workflow: AAR text, required screenshot, submit for S3 review.
- Operations Package planning should be a dedicated workflow page, not scattered forms.
- Member Profile editing should keep basics compact and move sensitive/admin fields to restricted sections.
- Qualification Records need context-specific forms for award/revoke/edit rather than one generic dense form.
- Attendance should support fast bulk update and keep overrides behind confirmation.
- Cases and Communications need wizard-like steps only when the selected type requires them.
- Discord Configuration should be separated into settings, channel mapping, role mapping, sync, diagnostics, and moderation sections.

## Drawer and Modal Findings

Current canonical drawer: `src/components/inspector/inspector-drawer.tsx`.

Recommended size categories:

| Pattern | Use For | Notes |
| --- | --- | --- |
| Compact Action Modal | Confirmations, simple status changes | 1 to 3 fields, focus trap required |
| Standard Form Drawer | Create member, assign unit, award qualification | Right-side desktop, full-screen mobile |
| Wide Inspector Drawer | Member, deployment, application, patrol detail | Tabs allowed, internal scroll required |
| Dedicated Workflow Page | Operations Package, role builder, form builder | Avoid huge modal forms |
| Full-Screen Mobile Sheet | Any drawer/modal below 768px | Escape/close button plus internal scroll |

Known issue to verify in Phase 3: `InspectorDrawer` supports Escape close, overlay close, and internal scroll, but does not implement a full focus trap. Complex forms using it should be audited for keyboard containment.

## Responsive Findings

Source review shows the shell is built for `h-dvh`, stable sidebar, mobile nav, and independent content scrolling. Expected risk points by breakpoint:

| Width | Risk |
| --- | --- |
| 1440px | Dense pages encourage too many side-by-side cards |
| 1280px | Sidebar plus wide tables may crowd content |
| 1024px | `lg:block` sidebar threshold means tablet users may see cramped nav/content |
| 768px | Tables and action toolbars are likely to wrap or overflow |
| 390px | Dense admin forms, role matrix, qualification matrix, Discord settings, and operations package require mobile sheets or stacked workflows |

Phase 3 should capture screenshots of `/dashboard`, `/operations`, `/operations/campaigns`, `/operations/packages/[campaignId]/week/[weekNumber]`, `/administration/discord`, `/administration/roles`, `/personnel/roster`, and `/training/qualification-matrix` at 1440, 1024, 768, and 390px.

## Accessibility Findings

- The shell has semantic navigation labels and many buttons include labels or screen-reader text.
- Inspector drawers support Escape close but should add focus trapping and restore focus to the opener.
- `details/summary` progressive disclosure is useful but should be reviewed for keyboard and screen-reader copy.
- Dense icon/action areas need consistent visible labels at mobile sizes.
- Disabled placeholder buttons should explain why they are disabled.
- Form labels should be audited; placeholder-only labels are not enough.
- Tables need responsive alternatives, not horizontal scrolling as the only mobile strategy.
- Status badges must not be the only way to convey state.
- Reduced-motion behavior has not been systematically documented.

## Design-System Findings

Canonical patterns to keep:

- `AppShell`, `TopBar`, `SidebarNav`, `MobileNav`
- `PageHeader`
- `InspectorDrawer`
- `CollapsibleSection`, `AttentionPanel`, `SummaryCard`, `MetadataList`
- `KpiCard`, `DashboardWidget`, `ReadinessCard`
- `EmptyState`, `LoadingSkeleton`
- `StatusBadge` and domain-specific badge wrappers

Patterns to consolidate:

- `components/data/filter-bar.tsx` and `components/shared/filter-bar.tsx`
- `components/data/search-input.tsx` and `components/shared/search-input.tsx`
- `components/status/status-badge.tsx` and `components/shared/status-badge.tsx`
- placeholder action patterns inside `EmptyState`, `CommandPalette`, and inspector actions
- repeated card/table/form scaffolding across admin pages

## Quick Wins

Implemented in this audit:

- Replaced stale sidebar subtitle `Milestone 2 shell polish` with `Operations workspace`.

Implemented in Phase 3 Epic 2:

- Added a canonical `NeedsAttention` pattern for actionable problems.
- Expanded `src/components/layout/progressive-disclosure.tsx` with compact metrics, advanced filters, activity previews, inspector summaries, inline issues, status summaries, and lightweight detail tabs.
- `/dashboard` uses the canonical Needs Attention component and keeps secondary analytics collapsed.
- `/communications` promotes failed, active, and scheduled work while collapsing history, delivery timeline, templates, preferences, and diagnostics.
- `/community-management` promotes critical cases, unassigned cases, and appeals while collapsing health indicators and moderation history.
- `/administration/discord` promotes delivery, identity, webhook, and gateway risks while collapsing gateway handler and recent event diagnostics.
- `/operations/events` keeps document, RSVP, and attendance details available while reducing visible table pressure at narrower widths.
- `/operations/deployments` uses the shared advanced-filter pattern.

Recommended but not implemented in this audit:

- Remove duplicate Operations nav destination or relabel `Planning Packages`. Implemented in Phase 3 Epic 1.
- Move Communications out of Administration navigation. Implemented in Phase 3 Epic 1.
- Hide Builder routes behind a Developer Tools group. Implemented in Phase 3 Epic 1.
- Replace hard-coded unit nav entries with dynamic unit shortcuts or only `All Units`. Implemented in Phase 3 Epic 1 as a single Units destination.
- Add focus trap to `InspectorDrawer`. Implemented in Phase 3 Epic 1.
- Add route-safe constants for Operations routes.

## Recommended Order of Work

1. Phase 3 Epic 1: Global Layout Simplification.
2. Phase 3 Epic 2: Information Hierarchy.
3. Phase 3 Epic 5: Operations Workflow Polish.
4. Phase 3 Epic 3: Workflow Simplification.
5. Phase 3 Epic 4: Persona-Based UX.
6. Phase 3 Epic 6: Personnel & Training Workflow Polish.
7. Phase 3 Epic 7: Design Consistency Audit.
8. Phase 3 Epic 8: Usability Testing & Cleanup.

## Phase 3 Epic 7 Design-System Update

Epic 7 formalized the canonical component direction from this audit:

- `Button` now includes semantic variants for primary, secondary, outline, ghost, destructive, warning, success, link, and icon usage.
- `ActionGroup` standardizes action wrapping and placement.
- `SectionHeader` standardizes section hierarchy.
- `CompactList` provides a canonical dense queue/list pattern.
- New standards documents in `docs/02-ui/` capture token, typography, spacing, card, action, badge, alert, drawer, modal, timeline, upload, responsive, and accessibility rules.
- Remaining design inconsistencies should be handled as Epic 8 validation findings rather than broad route rewrites.
