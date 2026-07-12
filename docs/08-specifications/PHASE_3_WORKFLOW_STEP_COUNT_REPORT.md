# Phase 3 Workflow Step Count Report

Step counts are source-review estimates and should be confirmed during UAT.

| Workflow | Estimated Steps After Phase 3 | Phase 3 Target | Remaining Friction |
| --- | ---: | --- | --- |
| Login and account linking | 3 to 5 | Clear login/profile state | Real Discord OAuth test required. |
| Create Deployment | 3 to 5 | Open Deployments -> Create drawer -> Save | Browser test required for drawer URL state. |
| Plan Operational Week | 6 to 10 | Package page with next action/checklist | Complex but guided; needs seeded validation. |
| Publish Operational Week | 4 to 7 | Readiness -> Publish -> Release -> Delivery status | Discord delivery provider validation required. |
| Publish Amendment | 4 to 7 | Existing package release flow | Immutable history validation required. |
| Start Patrol | 3 to 5 | Patrols/Discord -> Start Patrol -> Announcement | Discord and portal paths require UAT. |
| Complete Patrol | 2 to 4 | Open active patrol -> Complete | Needs seeded patrol. |
| Submit Patrol AAR | 4 to 7 | AAR form -> screenshot -> submit | File upload validation required. |
| Review Patrol AAR | 4 to 7 | Queue -> inspect -> review/progression -> save | Seeded AAR required. |
| Record Deployment progression | 3 to 6 | AAR review/package context | Needs seeded deployment. |
| Assess Commander's Intent | 3 to 6 | Intent panel/context | Needs seeded package. |
| Start next Week planning | 3 to 6 | Package handoff -> next week | Needs seeded deployment weeks. |
| Find Member | 2 to 4 | Members/roster search -> inspector/profile | Browser search validation required. |
| Assign Member | 4 to 7 | Roster/member -> assignment form -> audit | Seeded roster required. |
| Transfer Member | 5 to 8 | Request -> review -> apply | Workflow hook validation required. |
| Submit LOA | 3 to 5 | Request form -> submit | Member persona required. |
| Review LOA | 4 to 6 | Staff queue -> review -> status | Staff persona required. |
| Configure Qualification Requirement | 4 to 7 | Catalog/matrix -> requirement mapping | Training persona required. |
| Award Qualification | 3 to 6 | Matrix/member -> award drawer/form | Training persona required. |
| Renew Qualification | 3 to 6 | Record -> renew | History validation required. |
| Record Attendance | 4 to 8 | Event/attendance -> update -> finalize | Seeded event required. |
| Correct Attendance | 4 to 7 | Finalized record -> correction reason -> save | Audit validation required. |
| Create Announcement | 4 to 7 | Communications -> draft -> preview -> send | Provider validation required. |
| Retry Failed Delivery | 2 to 4 | Dashboard/Delivery Review -> retry | Delivery records required. |
| Create Case | 4 to 7 | Community -> create -> assign/context | Community persona required. |
| Execute Moderation | 5 to 8 | Case -> reason -> execute -> record result | Discord hierarchy/API validation required. |

## Assessment

Phase 3 reduced scanning and route guessing, but final measured step counts require live seeded UAT.

