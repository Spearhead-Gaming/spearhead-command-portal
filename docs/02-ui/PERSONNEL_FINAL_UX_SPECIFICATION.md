# Personnel Final UX Specification

Phase 3 Epic 6 keeps existing Personnel, Unit, Qualification, Attendance, Training, Assignment, Transfer, LOA, Readiness, Recommendation, Case, Rule, and Communication foundations intact. The pass is presentation-first.

## Default Hierarchy

Personnel pages should answer:

- Who or which unit is in context?
- What is the current status?
- What needs attention?
- What is the next action?
- Where is the history?

Show current status, next action, needs attention, and readiness reasons first. Move history, diagnostics, low-priority analytics, optional rank, technical Discord fields, audit, and restricted notes into inspectors, tabs, or collapsible sections.

## Identity and Rank

Discord display name is the primary visible member name. First and last name are not required. Rank remains available as future/optional metadata and must not be a primary roster structure.

## Canonical Components

- `PersonnelNextActionCard` for the next role-owned action.
- `PersonnelHandoffRail` for member -> unit leadership -> S1 -> readiness/training handoffs.
- `MemberInspectorDrawer` for contextual member detail.
- `CollapsibleSection` for filters, history, diagnostics, optional rank, and secondary analytics.

## Route Ownership

- `/personnel`: Personnel & Readiness Center.
- `/personnel/members`: focused member directory.
- `/personnel/roster`: assignment/status management workspace.
- `/personnel/members/[id]`: service-record profile.
- `/units` and `/units/[unitId]`: unit directory and unit health dashboard.
- `/personnel/qualifications`: qualification catalog.
- `/training/qualification-matrix`: unit-scoped qualification readiness matrix.
- `/operations/attendance`: attendance reporting.
