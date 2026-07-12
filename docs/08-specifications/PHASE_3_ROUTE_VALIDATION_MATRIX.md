# Phase 3 Route Validation Matrix

## Validation Method

This matrix combines source route inventory, Next.js production build output, static link/action scans, and Phase 3 documentation review.

Manual seeded-browser click-through remains required before production release. Routes marked `Build Verified` compiled in the production build, but were not all manually exercised with seeded data during this pass.

## Status Legend

| Status | Meaning |
| --- | --- |
| Build Verified | Route compiled and appears in the production route manifest. |
| Redirect Verified | Source route redirects to canonical destination. |
| Static Review | Route source reviewed for labels/actions at a high level. |
| UAT Required | Requires seeded data, browser interaction, external provider, or persona account. |

## Public And Auth Routes

| Route | Purpose | Status | Notes |
| --- | --- | --- | --- |
| `/` | Entry redirect/home | Build Verified | Runtime redirect behavior should be confirmed in browser. |
| `/login` | Discord OAuth login | Build Verified, UAT Required | Real OAuth credentials required. |
| `/logout` | Session logout | Build Verified, UAT Required | Browser session required. |
| `/internal/bootstrap` | Hidden developer bootstrap | Build Verified, UAT Required | Must remain env-gated and hidden from navigation. |
| `/unauthorized` | Missing auth state | Build Verified | Static page. |
| `/forbidden` | Missing permission | Build Verified | Static page. |
| `/_not-found` | Missing route | Build Verified | Next.js generated not-found route. |

## Core Workspace Routes

| Route | Purpose | Status | Notes |
| --- | --- | --- | --- |
| `/dashboard` | Role-aware command dashboard | Build Verified, Static Review | Dashboard terminology patched from `Mission Review` to `Operation Review`. |
| `/personnel` | Personnel Readiness Center | Build Verified, Static Review | Uses next-action and compact attention list patterns. |
| `/personnel/members` | Member directory | Build Verified, UAT Required | Inspector and create/edit workflows require seeded DB validation. |
| `/personnel/members/[id]` | Member service record | Build Verified, UAT Required | Restricted notes/audit tabs require persona validation. |
| `/personnel/roster` | Roster management | Build Verified, UAT Required | Assignment history must be browser-validated. |
| `/personnel/qualifications` | Qualification catalog | Build Verified, UAT Required | Previously blank-page risk should be checked in browser. |
| `/training/qualification-matrix` | Qualification matrix | Build Verified, UAT Required | Dense responsive matrix requires screenshot validation. |
| `/training/events` | Training events | Build Verified | Partial/foundation route. |
| `/training/instructors` | Instructor overview | Build Verified | Partial/foundation route. |
| `/units` | Unit directory | Build Verified, Static Review | Canonical action grouping applied. |
| `/units/[unitId]` | Unit dashboard | Build Verified, UAT Required | Unit-scoped readiness needs seeded data validation. |

## Operations Routes

| Route | Purpose | Status | Notes |
| --- | --- | --- | --- |
| `/operations` | Operations Center | Build Verified, UAT Required | Must be tested with active deployment/week data. |
| `/operations/deployments` | Deployment list/create | Build Verified, UAT Required | Create drawer must be browser-tested. |
| `/operations/deployments/[id]` | Deployment detail | Build Verified, UAT Required | Resource inheritance/versioning needs seeded data. |
| `/operations/campaigns` | Legacy deployment redirect | Build Verified, Redirect Verified | Preserves legacy route compatibility. |
| `/operations/campaigns/[id]` | Legacy deployment detail redirect | Build Verified, Redirect Verified | Preserves legacy route compatibility. |
| `/operations/packages/[campaignId]/week/[weekNumber]` | Operations Package | Build Verified, UAT Required | Critical workflow route; seeded package required. |
| `/operations/packages/[campaignId]/week/[weekNumber]/releases` | Release history | Build Verified, UAT Required | Immutable release history requires data validation. |
| `/operations/this-week` | Member current-week view | Build Verified, UAT Required | Needs active published package. |
| `/operations/weekly-tasking` | Weekly tasking view | Build Verified | Should remain secondary to package workspace. |
| `/operations/events` | Events list | Build Verified, UAT Required | RSVP/Discord publish actions require data/provider validation. |
| `/operations/events/[id]` | Event detail | Build Verified, UAT Required | Attendance and Discord sections need interaction validation. |
| `/operations/attendance` | Attendance reporting | Build Verified, UAT Required | Finalize/correction flows need seeded data. |
| `/operations/patrols` | Patrol command | Build Verified, UAT Required | Portal and Discord patrol lifecycle must be manually tested. |
| `/operations/aars` | AAR records | Build Verified, UAT Required | AAR upload paths require file validation. |
| `/operations/aar-queue` | Patrol AAR review queue | Build Verified, UAT Required | Required screenshot and review actions require seeded data. |
| `/operations/conops` | CONOP records/resources | Build Verified | CONOP should remain operation-package resource-centered. |
| `/operations/s3` | S3 operations workspace | Build Verified, Static Review | Visible terminology patched from mission wording where user-facing. |
| `/operations/zeus` | Zeus assignment workspace | Build Verified, UAT Required | Resource download behavior requires file validation. |

## Documents, Applications, Communications, Community

| Route | Purpose | Status | Notes |
| --- | --- | --- | --- |
| `/documents` | Document library | Build Verified, UAT Required | Upload/download requires storage validation. |
| `/documents/[id]` | Document detail | Build Verified, UAT Required | Permissioned document access requires seeded data. |
| `/applications` | Member forms/submissions | Build Verified, UAT Required | Member-facing flows require persona testing. |
| `/applications/[id]` | Form submission detail | Build Verified, UAT Required | Draft/submitted statuses require seeded data. |
| `/communications` | Communications Center | Build Verified, UAT Required | Delivery provider failures/retries require provider simulation. |
| `/community-management` | Cases/moderation | Build Verified, UAT Required | Confidentiality/moderation actions require persona and Discord validation. |

## Administration And Developer Routes

| Route | Purpose | Status | Notes |
| --- | --- | --- | --- |
| `/administration` | Admin overview | Build Verified | Summary/attention surface. |
| `/administration/users` | User management | Build Verified, UAT Required | Role assignment and duplicate identity merge require data validation. |
| `/administration/roles` | Role builder | Build Verified, UAT Required | Permission matrix interaction requires browser testing. |
| `/administration/discord` | Discord settings/diagnostics | Build Verified, UAT Required | OAuth/REST/Webhook/Gateway separation requires real config. |
| `/administration/notifications` | Delivery review | Build Verified, Static Review | Previously broken dashboard link now compiles and routes. |
| `/administration/forms` | Form templates | Build Verified, UAT Required | Builder actions require seeded data. |
| `/administration/forms/[id]` | Form template detail | Build Verified, UAT Required | Field editing requires browser testing. |
| `/administration/submissions` | Staff review queue | Build Verified, UAT Required | Approval/denial/comment actions require seeded data. |
| `/administration/audit-logs` | Audit logs | Build Verified, UAT Required | Permission and filtering require seeded audit data. |
| `/administration/settings` | Developer/system settings | Build Verified | Should remain developer-gated. |
| `/administration/builder` | Builder overview | Build Verified | Developer/foundation route. |
| `/administration/builder/forms` | Builder forms | Build Verified | Foundation route. |
| `/administration/builder/workflows` | Workflow templates | Build Verified | Foundation route. |
| `/administration/builder/automations` | Automation rules | Build Verified | Execution intentionally placeholder-only. |
| `/administration/builder/dashboards` | Dashboard layouts | Build Verified | Foundation route. |
| `/administration/builder/widgets` | Widget catalog | Build Verified | Foundation route. |

## Findings

- No canonical route returned a compile/build failure.
- Legacy campaign routes remain as redirects for compatibility.
- Runtime click-through validation remains required for dynamic, provider-backed, file-backed, and permission-sensitive workflows.

