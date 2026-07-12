# Phase 3 Defect Backlog

## Summary

No unresolved Critical or High release blocker was proven by automated validation during this pass. Several Medium and Low items remain because they require seeded browser validation, real Discord configuration, file storage, or persona-specific accounts.

## Critical

| Title | Route/Workflow | Affected Persona | Status | Release Blocker |
| --- | --- | --- | --- | --- |
| None confirmed | N/A | N/A | N/A | No |

## High

| Title | Route/Workflow | Affected Persona | Defect | Fix Status | Release Blocker |
| --- | --- | --- | --- | --- | --- |
| Seeded browser click-through not completed | All major workflows | All | Static/build validation cannot prove all runtime actions work with seeded data. | Documented; requires UAT execution. | No, unless UAT finds blocker |
| Real Discord provider validation pending | Discord OAuth, slash commands, Gateway, delivery | Admin, Discord staff, members | Build cannot prove external Discord credentials, webhook, Gateway, and permissions are configured. | Documented in validation plan. | Conditional |
| File upload/download validation pending | Resources, AAR screenshots, documents, evidence | S3, patrol leaders, staff | Build cannot prove storage, content-disposition, MIME, or permission behavior. | Documented in UAT/release checklist. | Conditional |

## Medium

| Title | Route/Workflow | Affected Persona | Defect Description | Reproduction Steps | Expected | Actual | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Remaining internal Campaign/Mission symbols | Operations/S3 internals | Developers | Compatibility model/service names still use Campaign/Mission. | Search source for `Campaign` or `Mission`. | User-facing copy uses Deployment/Operation; internal symbols may remain. | Visible high-impact labels patched; internal names remain. | Accepted |
| Browser responsive screenshots pending | Major pages | All | Static review cannot prove no overlap at 390/768/1024/1280/1440. | Capture screenshots at required widths. | No overlap/offscreen actions. | Not executed in this pass. | UAT Required |
| Persona account matrix pending | All persona workspaces | All | Need representative seeded accounts for each persona. | Log in as each persona. | Coherent nav/widgets, no permission elevation. | Not executed in this pass. | UAT Required |
| Console/network audit pending | Major routes | All | DevTools route walk was not executed for all routes. | Open each route with DevTools. | No recurring app errors. | Not executed in this pass. | UAT Required |

## Low

| Title | Route/Workflow | Impact | Status |
| --- | --- | --- | --- |
| Placeholder/foundation routes remain visible to authorized developers | Builder/settings | Could confuse operators if permissions are too broad. | Acceptable if developer permissions stay restricted. |
| Some docs retain historical Campaign terminology | Architecture/database docs | Can confuse readers if not marked compatibility. | Existing canonical terminology docs explain compatibility; future docs cleanup recommended. |
| Some dense lists still use bespoke row cards | Operations/Community/Admin | Visual consistency polish remains. | Deferred to targeted cleanup after UAT findings. |

## Deferred Enhancements

| Title | Recommended Owner | Notes |
| --- | --- | --- |
| Automated route smoke runner | Engineering | Add authenticated seeded smoke tests when test harness exists. |
| Visual regression suite | Engineering/Design | Add screenshots for Phase 3 critical routes. |
| Full component accessibility tests | Engineering | Add dialog/drawer/menu focus tests once component test stack is active. |

