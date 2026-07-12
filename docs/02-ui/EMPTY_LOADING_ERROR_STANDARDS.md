# Empty, Loading, And Error Standards

Empty, loading, and error states should preserve context and explain the next useful action.

## Empty States

An empty state should explain:

- What belongs here
- Why it matters
- What can be done next

Avoid generic "No data found" when a domain-specific explanation is possible.

## Loading States

- Use local skeletons where practical.
- Avoid replacing the whole page when only one section is loading.
- Keep the page header and primary context visible.

## Error States

- Show a concise summary.
- Preserve unaffected content.
- Provide a retry or navigation path where possible.
- Keep raw exception details out of normal operational views.
- Put technical diagnostics in collapsed sections or admin-only views.
# Phase 3 Epic 7 Addendum

Empty, loading, and error states should use shared primitives instead of route-specific cards.

Canonical empty-state variants:

- First use.
- No current work.
- Healthy or nothing wrong.
- Filtered no results.
- Unauthorized.
- Not applicable.
- Missing configuration.
- No active context.
- Archived empty state.

Each state should include a clear title, concise explanation, and one optional next action. Avoid generic "No data found" copy unless the lack of data is genuinely neutral.
