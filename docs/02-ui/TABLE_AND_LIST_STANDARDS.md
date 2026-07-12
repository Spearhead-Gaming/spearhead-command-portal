# Table And List Standards

Tables should use compact default columns and move secondary detail into inspectors, row summaries, or responsive hidden columns.

## Default Columns

Most tables should start with:

- Name or title
- Status
- Unit, category, or type
- Key date
- Primary action

## Secondary Detail

Move these out of default columns when practical:

- Long descriptions
- Full metadata stacks
- Audit/history fields
- Raw IDs
- Delivery payloads
- Full participant or recipient lists
- Detailed readiness rules

## Responsive Behavior

- Hide secondary columns below wide desktop breakpoints.
- Preserve the primary action column.
- Add concise supporting text under the title when hidden columns contain important state.
- Prefer card/list fallback for structurally dense tables in later workflow polish epics.

## Current Decisions

- Events now keep title, status, date, unit, and action primary. Documents, RSVP, and attendance remain available as wide-screen columns and compact title metadata on smaller screens.
# Phase 3 Epic 7 Addendum

Use `CompactList` for dense mobile-first queues before creating a new bespoke list item.

Default table/list priority order:

- Primary identity.
- Status.
- Scope, category, or type.
- Key date.
- Primary action.

Move secondary metadata into an inspector drawer, row detail, or collapsible section. When a table becomes difficult below tablet width, prefer a compact list fallback over page-level horizontal overflow.
