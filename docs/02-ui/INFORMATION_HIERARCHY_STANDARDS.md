# Information Hierarchy Standards

Every major portal page should answer, in order:

1. What is this page for?
2. What needs attention?
3. What action should I take next?
4. Where is the full detail?

## Visibility Levels

Primary content is visible by default. It includes current state, critical warnings, next action, and one obvious primary action.

Secondary content supports decisions. It may remain visible when it directly helps the current task, otherwise it belongs in supporting cards, sidebars, tabs, or collapsed sections.

Tertiary content includes history, audit, diagnostics, payloads, exhaustive metadata, and low-frequency configuration. It should be available but should not compete with active work.

## Page Order

Use this order unless a workflow-specific page requires otherwise:

1. Page header
2. Primary action or current status
3. Needs Attention
4. Core working content
5. Supporting summary
6. Secondary details
7. History, audit, diagnostics

## Implementation Notes

- Prefer `NeedsAttention` for actionable problems.
- Prefer `CollapsibleSection` for secondary analytics, history, diagnostics, and advanced configuration.
- Prefer inspector drawers for row/card detail.
- Avoid repeating the page title inside the first card.
- Avoid multiple primary-styled buttons in the same visual region.
