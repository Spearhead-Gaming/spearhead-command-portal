# Phase 3 Security And Permission Validation

## Static Validation

Reviewed Phase 3 docs, route inventory, and source patterns for permission/security risks.

## Positive Findings

- Permission model is key-based by doctrine.
- Persona switching is documented as presentation-only and does not replace server-side permission checks.
- Developer bootstrap route remains hidden and environment gated.
- Discord is documented as communication layer, not source of truth.
- Bot accounts are excluded from sync by default according to current doctrine.
- Notification clearing is documented as non-destructive to audit/delivery history.

## Required UAT Checks

| Area | Check | Status |
| --- | --- | --- |
| Direct unauthorized routes | Return 403/forbidden without restricted data flash. | Pending UAT |
| Persona switching | Does not grant permissions. | Pending UAT |
| Restricted notes/cases | Do not render or flash for unauthorized users. | Pending UAT |
| Developer tools | Hidden from normal admins without developer permission. | Pending UAT |
| Discord commands | Validate identity and portal permissions; no Discord-role-only auth. | Pending Provider |
| Interaction webhook | Signature validation rejects invalid requests. | Pending Provider |
| File downloads | Enforce permission and content disposition. | Pending UAT |
| External links | Open safely with appropriate `rel`. | Pending UAT |
| Destructive actions | Require confirmation/reason where applicable. | Pending UAT |
| Secrets | No token/secret exposed in UI/logs. | Pending Provider |

## Data Integrity Checks To Execute

- No duplicate User records for one Discord ID.
- No duplicate MemberProfile records for one Discord ID.
- Assignment/status/qualification/attendance histories are preserved.
- Release/amendment/resource version histories are immutable.
- Evidence and audit logs are not hard-deleted.
- Repeated Discord/provider events are idempotent.

## Assessment

No static critical security defect was confirmed in this pass. Release readiness remains conditional on seeded permission testing and Discord/provider validation.

