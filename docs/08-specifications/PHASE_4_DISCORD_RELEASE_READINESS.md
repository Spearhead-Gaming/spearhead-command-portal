# Phase 4 Discord Release Readiness

## Checklist

| Area | Status | Evidence |
| --- | --- | --- |
| Architecture | Ready with warnings | Portal/Discord boundary documented. |
| Database | Ready with warnings | Prisma validates; migration baseline still needed for production. |
| OAuth | Requires environment validation | Credentials are environment-specific. |
| REST | Requires live validation | Bot token validation needs real Discord credentials. |
| Interactions | Requires live validation | Public HTTPS endpoint and public key required. |
| Command Registration | Requires test guild validation | Use `npm run discord:commands:register`. |
| Gateway | Optional, requires worker validation | Slash commands do not require Gateway. |
| Guilds | Requires certification | Use Operations Center readiness panel. |
| Resource Discovery | Requires test guild validation | Run discovery before certification. |
| Mappings | Requires administrator review | Channel and role mappings must be explicit. |
| Automation | Preview first | Do not enable automatic actions until certified. |
| Communications | Ready with mappings | Failed deliveries must be reviewed. |
| Events | Preview first | Manage Events capability must be verified. |
| Moderation | Preview and case-backed only | No moderation without Portal Case context. |
| Applications | Ready with warnings | `/apply` exists; Phase 5 engine deferred. |
| Files | Requires storage validation | AAR/download paths must persist on deployment host. |
| Health | Ready | Unified readiness service exists. |
| Diagnostics | Ready | Operations Center and CLI preflight exist. |
| Permissions | Ready with audit follow-up | Discord permissions added; live route tests still needed. |
| Rollback | Documented | Disable feature flags and Gateway first. |

## Decision

Ready with non-blocking issues for staging validation. Not ready for broad production enablement until test guild UAT and deployment checks pass.
