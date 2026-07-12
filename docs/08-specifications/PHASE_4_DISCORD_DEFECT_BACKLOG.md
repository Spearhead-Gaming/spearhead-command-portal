# Phase 4 Discord Defect Backlog

## Critical

No unresolved critical defects are known from local static validation.

## High

| Defect | Subsystem | Status | Release Blocker | Notes |
| --- | --- | --- | --- | --- |
| Live Discord validation not executed in this environment | Platform | Open | No | Requires safe test guild and real credentials. |
| Prisma Migrate baseline absent | Database | Open | Environment-dependent | Existing project uses `prisma db push`; production needs a migration baseline before formal release. |

## Medium

| Defect | Subsystem | Status | Notes |
| --- | --- | --- | --- |
| Gateway worker lifecycle must be verified in Plesk/Docker | Gateway | Open | Validate separate process, lease, restart, and logs. |
| Application panels are documented but not fully lifecycle-managed | Applications | Deferred Phase 5 | Slash commands and continuation links remain usable. |

## Low

| Defect | Subsystem | Status | Notes |
| --- | --- | --- | --- |
| Some diagnostics are read-only summaries | Diagnostics | Accepted | Safe for Phase 4; deeper drill-down can follow. |

## Deferred Phase 5

- Full configurable Application Engine.
- Visual form builder.
- Generic application provider registry.
- Application panel version editor.
- Generic approval workflow designer.
