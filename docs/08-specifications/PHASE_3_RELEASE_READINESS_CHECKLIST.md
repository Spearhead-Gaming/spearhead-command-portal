# Phase 3 Release Readiness Checklist

## Status Legend

| Status | Meaning |
| --- | --- |
| Pass | Evidence exists in this pass. |
| Pending UAT | Needs seeded browser/user validation. |
| Pending Provider | Needs external provider or real credentials. |
| Not Applicable | No change or no current implementation. |

| Category | Status | Owner | Supporting Evidence | Blocker State | Notes |
| --- | --- | --- | --- | --- | --- |
| Build | Pass | Engineering | `npm.cmd run build` passed. | Not blocked | Existing dev-login production warning remains. |
| Lint | Pass | Engineering | `npm.cmd run lint` passed. | Not blocked | No lint errors. |
| Typecheck | Pass | Engineering | `npm.cmd run typecheck` passed. | Not blocked | No TypeScript errors. |
| Database | Pass | Engineering | No schema changes in Epic 8. | Not blocked | Prisma validation not required for this pass. |
| Authentication | Pending UAT | Admin/Engineering | Routes compile. | Conditional | Real Discord OAuth login must be tested. |
| Identity Linking | Pending UAT | Admin | Existing identity services compile. | Conditional | Validate duplicate prevention with seeded Discord IDs. |
| Permissions | Pending UAT | Admin | Route guards compile. | Conditional | Persona/direct-route testing required. |
| Navigation | Pass / Pending UAT | Engineering | All routes build; legacy redirects compile. | Not blocked | Browser back/active state still needs click-through. |
| Operations | Pending UAT | S3 | Routes compile. | Conditional | Create/publish/package workflows need seeded data. |
| Patrols | Pending UAT | S3/Patrol Leaders | Routes compile. | Conditional | Portal and Discord patrol lifecycle needs end-to-end test. |
| AAR | Pending UAT | S3 | Forms compile. | Conditional | Screenshot upload validation required. |
| Publishing | Pending UAT | S3 | Release routes compile. | Conditional | Immutable release/amendment history needs seeded validation. |
| Personnel | Pending UAT | S1 | Routes compile. | Conditional | Assignment/status/LOA/transfer actions need seeded validation. |
| Qualifications | Pending UAT | Training | Routes compile. | Conditional | Matrix/actions need seeded validation. |
| Attendance | Pending UAT | Unit Leadership | Routes compile. | Conditional | Finalization/correction flows need seeded validation. |
| Communications | Pending Provider | Communications/Admin | Routes compile. | Conditional | Provider failure/retry tests needed. |
| Community Management | Pending UAT | Community Manager | Route compiles. | Conditional | Confidentiality and Discord moderation need validation. |
| Discord | Pending Provider | Discord Admin | Routes/scripts compile. | Conditional | OAuth, REST, Webhook, Gateway all require configured test guild. |
| Gateway | Pending Provider | Discord Admin | Gateway code compiles. | Conditional | Offline/degraded/reconnect behavior must be tested. |
| File Storage | Pending UAT | Engineering | Upload/download routes compile. | Conditional | MIME, disposition, permissions require storage test. |
| Accessibility | Pending UAT | Engineering/Design | Static standards exist. | Conditional | Keyboard/screen-reader audit still required. |
| Responsive Design | Pending UAT | Design/Engineering | Responsive standards exist. | Conditional | Screenshot matrix still required. |
| Browser Support | Pending UAT | QA | Build passed. | Conditional | Chrome/Edge/Firefox click-through required. |
| Documentation | Pass | Engineering | Final validation docs created/updated. | Not blocked | Superseded historical docs remain as compatibility references. |
| Backups | Pending Ops | Operations | Not changed by this pass. | Conditional | Confirm DB/file backup before release. |
| Rollback | Pending Ops | Operations | Rollback notes in final report. | Conditional | Confirm deploy rollback procedure. |
| Monitoring | Pending Ops | Operations | Observability review documented. | Conditional | Confirm production log/error correlation. |
| UAT | Pending UAT | Spearhead Staff | UAT plan created. | Conditional | Must execute before release decision. |

