# Personnel & Readiness Center

## Purpose

The Personnel & Readiness Center is the command-facing hub for member status, unit assignment, qualification readiness, attendance concerns, transfer/LOA review, and personnel follow-up actions.

The portal remains the source of truth. Discord supplies identity and communication context only.

## Doctrine

- Discord display name is the primary visible member name.
- First name and last name are not required.
- Rank is optional and should not drive roster structure.
- Personnel management is organized around member, unit, position or billet, status, qualifications, attendance, readiness, assignment history, and service history.
- Readiness must be explainable through Universal Rule Engine results.

## Route

- `/personnel`

## Primary Sections

- Overview metrics: total members, active members, LOA, missing qualifications, pending actions.
- Needs Attention: members blocked by assignment, status, qualifications, attendance, or unresolved action items.
- Rule Engine Findings: member and unit readiness warnings and failures.
- Unit Readiness: active strength, missing required qualifications, vacant leadership billets.
- Attendance Concerns: low attendance indicators scoped to permitted units.
- Personnel Actions: S1 follow-up queue.
- Transfers and LOA: case-backed review queues and lightweight request forms.

## Service Boundary

Personnel center logic belongs in the server personnel service layer. UI components should render returned data and submit server actions only.

## Permissions

- `personnel.dashboard.view`
- `personnel.actions.view`
- `personnel.actions.manage`
- `readiness.member.view`
- `readiness.unit.view`
- `transfers.view`
- `transfers.submit`
- `transfers.review`
- `loa.view`
- `loa.submit`
- `loa.review`

## Integrations

- Universal Rule Engine for member and unit readiness results.
- Universal Case Engine for transfer, LOA, profile correction, and qualification exception reviews.
- Unified Communication Pipeline for transfer and LOA notifications.
- Audit service for personnel action, transfer, LOA, and attendance policy changes.
