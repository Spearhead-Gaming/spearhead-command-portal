# Unit Management

## Purpose

Unit management defines the current Spearhead structure, unit policies, positions or billets, and unit-scoped readiness expectations.

## Unit Fields

- Name
- Short name or abbreviation
- Description
- Parent unit, optional
- Active state
- Positions or billets
- Attendance policy
- Qualification requirements
- Readiness signals

## Positions and Billets

A position or billet may define:

- Title
- Unit
- Description
- Maximum occupants
- Reports-to position
- Required or recommended qualifications
- Readiness expectations
- Permission package placeholder
- Active state

Positions do not automatically grant portal permissions. Access must still flow through roles and permission assignments.

## Assignment History

Changing a member's unit or position must preserve roster assignment history. Current assignment fields provide fast lookup, but historical assignments remain available for timelines and audit review.

## Permissions

- `units.view`
- `units.manage`
- `units.dashboard.view`
- `units.assignments.manage`
- `units.positions.manage`
- `units.requirements.manage`
- `units.readiness.view`
