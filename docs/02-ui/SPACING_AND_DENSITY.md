# Spacing And Density

The Portal supports two practical density modes: comfortable and compact.

## Comfortable Density

Use for:

- Forms
- Detail pages
- Inspector content
- Planning workspaces
- Review workspaces

Default patterns:

- Page sections: `space-y-6` or `SectionStack`
- Card content: `p-4` to `p-6`
- Form fields: `gap-3`
- Workspace splits: `SplitWorkspace`

## Compact Density

Use for:

- Rosters
- Queues
- Delivery lists
- Activity feeds
- Qualification matrices
- Admin diagnostics

Default patterns:

- Row cards: `CompactList`
- Table rows: shared table primitives
- Inline metadata: short and muted
- Secondary detail: drawer, tabs, or collapsible content

## Rules

- Avoid full-width metric grids when a compact attention list would better answer the next action.
- Do not create page-level horizontal overflow.
- Action groups should wrap through `ActionGroup`.
- Dense tables should prioritize identity, status, scope/type, date, and one primary action.

