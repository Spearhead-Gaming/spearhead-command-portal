# Phase 3 User Acceptance Testing Plan

## Purpose

This plan gives Spearhead staff a practical test script for validating Phase 3 before release.

## Defect Severity

| Severity | Definition |
| --- | --- |
| Critical | Data loss, unauthorized data exposure, auth failure, broken primary workflow, build/migration failure. |
| High | Major workflow blocked with no workaround. |
| Medium | Workflow works but is confusing, slow, or requires workaround. |
| Low | Copy, visual polish, minor responsive issue. |

## Defect Report Format

- Tester:
- Persona:
- Route:
- Browser/device:
- Steps:
- Expected:
- Actual:
- Screenshot/video:
- Severity:
- Data record involved:

## Tester Groups And Scenarios

| Tester Group | Prerequisites | Scenarios | Pass Criteria |
| --- | --- | --- | --- |
| Community Member | Linked Discord user, member profile, active unit | Login, dashboard, This Week, RSVP, current mod preset, own profile, notifications, applications | Member can find next action without admin data. |
| Patrol Leader | Patrol permissions, active deployment/week | Start Patrol, mark interested, complete patrol, submit Patrol AAR with screenshot | Patrol can start quickly; AAR cannot submit without screenshot. |
| Unit Leader | Unit-scoped roster/readiness permissions | Unit dashboard, roster, inspect member, missing quals, attendance concerns | Unit-scoped data visible; restricted notes hidden. |
| S1 | Personnel/roster permissions | Create/edit member, assign unit/position, status, LOA/transfer review | History preserved; audit created for sensitive changes. |
| S3 | Operations permissions | Create deployment, package setup, readiness, publish, amendment, review Patrol AAR | Release created; Discord failures do not corrupt package. |
| Deployment Creator | Deployment ownership context | Review AAR progression, assess intent, start next week planning | AAR intelligence informs next week context. |
| Zeus | Assigned operation | Open CONOP, OPORD, Player Primer, Mod Preset, timeline | Required execution resources are reachable. |
| Training Staff | Qualification permissions | Catalog, requirements, matrix, award/renew/revoke, signoff review | Qualification history preserved. |
| Command Staff | Broad read permissions | Dashboard, operations health, community risks, personnel signals | Decision data visible without raw admin clutter. |
| Community Manager | Case/moderation permissions | Create case, restricted notes, evidence, decision, moderation failure | Confidentiality enforced; failures visible. |
| Administrator | Admin permissions | Users, roles, identity sync, Discord, audit, delivery review | Permission keys used; no secrets visible. |
| Developer | Developer permissions | Developer tools, diagnostics, bootstrap path, registry pages | Developer tools hidden from normal admins. |

## Required Browsers

- Chrome or Chromium.
- Microsoft Edge.
- Firefox.
- Safari remains unverified unless a tester has macOS/iOS access.

## Required Viewports

- 1440px.
- 1280px.
- 1024px.
- 768px.
- 390px.

