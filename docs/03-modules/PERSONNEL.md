# Personnel Module

## Purpose

Manage official member records.

## Core Features

- Personnel & Readiness Center
- Member profiles
- Optional rank tracking
- Unit assignment
- Position assignment
- Profile status
- Notes
- Logs
- Service history
- Transfer and LOA review queues
- Personnel actions

## Member Profile Fields

- Discord display name as the primary visible member name
- Discord ID
- Steam ID / Arma ID
- Rank, optional
- Unit
- Position
- Status
- Join date
- Qualifications
- Awards
- Attendance summary
- Service timeline

## Display and Identity Rules

- Use the shared member display-name helper.
- Do not require first name or last name.
- Do not make rank central to roster or readiness views.
- Discord identity supports display and account linking only. It does not determine permissions, readiness, qualifications, or unit assignment.

## Personnel & Readiness Center

The central route is `/personnel`.

See [PERSONNEL_READINESS_CENTER.md](PERSONNEL_READINESS_CENTER.md).

## Related Module Docs

- [UNIT_MANAGEMENT.md](UNIT_MANAGEMENT.md)
- [PERSONNEL_ACTIONS.md](PERSONNEL_ACTIONS.md)
- [UNIT_QUALIFICATION_READINESS.md](UNIT_QUALIFICATION_READINESS.md)

## Profile Logs

Automatically record important changes:
- rank changes
- unit transfers
- qualification awards
- status changes
- position changes
