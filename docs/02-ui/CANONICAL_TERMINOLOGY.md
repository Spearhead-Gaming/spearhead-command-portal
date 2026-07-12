# Canonical Terminology

## Purpose

This table defines preferred UX language for Phase 3. It should guide labels, page titles, button text, empty states, documentation, and route alias planning.

| Canonical Term | Avoid / Legacy | Meaning | Notes |
| --- | --- | --- | --- |
| Deployment | Campaign when referring to current operation arc | Long-running operation arc with operational weeks | Existing route may remain `/operations/campaigns` until alias migration |
| Operational Week | Campaign week, mission week | A week inside a deployment | Contains one Operations Package |
| Operations Package | Planning package, mission package | Weekly planning/release bundle | Includes tasking, resources, CONOP, Zeus, readiness, release |
| Weekend Operation | Mission when referring to scheduled main op | Primary scheduled weekly operation | Members should see "Weekend Operation" or "This Week" |
| Patrol | Mini-mission, side mission | Lightweight member-led activity | Requires AAR and screenshot |
| Patrol AAR | AAR when specifically tied to patrol | After-action report for patrols | Weekend Operations do not require AARs |
| AAR Review | AAR queue/review | S3 review of submitted AARs | Should include progression decisions |
| Weekly Tasking | Tasking package | Command-level tasking for the week | Part of Operations Package |
| Unit Tasking | Squad tasking | Unit-specific tasking | Avoid hard-coding unit names |
| CONOP Resource | CONOP editor | File/link attached to a weekly operation | CONOP belongs with weekly tasking |
| Current Mod Preset | Arma preset | Active ARMA3 preset for deployment/week | Show in member-facing operation views |
| Member / Discord Name | First name / last name | Primary member display name | Prefer Discord display name fallback chain |
| Position / Billet | Rank as primary roster structure | Functional assignment | Spearhead does not use rank as primary structure |
| Optional Rank | Rank | Future/optional rank model | Hide rank-heavy UI when empty |
| Communications Center | Notification Center for staff sending | Staff messaging and templates | Notification Center is user's personal inbox |
| Notification Center | Communications Center for personal inbox | User-visible notifications | Clearing does not delete delivery/audit history |
| Delivery Review | Failed notifications | Admin review of delivery status | Includes pending/sent/failed |
| Community Management Center | Moderation Center | Cases, moderation, incidents, appeals | Discord moderation is a tool, not the owner |
| Discord Settings | Discord Admin | Integration config, sync, gateway, diagnostics | Avoid mixing with community moderation ownership |
| Operations Center | S3 Dashboard if command-wide | Operational planning and health overview | S3 pages may become tabs/subviews |
| Readiness | Operational readiness when planning completeness | Context-specific readiness | Specify member, unit, package, publication, or health |
| Operational Health | Readiness when measuring current deployment state | Current deployment health | Separate from package readiness |
| Publication Readiness | Operational readiness before publishing | Can the package safely publish? | Separate from operational health |

## Button Labels

| Preferred | Avoid |
| --- | --- |
| Start Patrol | Create Patrol when action begins live patrol |
| Create Deployment | Create Campaign |
| Open Operations Package | Open Planning Package |
| Publish Weekly Operation | Publish Mission |
| Review AAR | Process AAR |
| Submit Request | Submit Form when user intent is LOA/transfer |
| Review Delivery | Open deliveries if route context is unclear |
| Configure Discord | Discord Admin |

## Route Naming Guidance

- Keep existing routes working until aliases/redirects are implemented.
- Prefer `/operations/deployments` as a future alias for `/operations/campaigns`.
- Prefer package route labels over "campaign week" labels.
- Avoid exposing dynamic unit slugs in primary navigation unless generated from data.
