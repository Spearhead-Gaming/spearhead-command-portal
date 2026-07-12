# Filter And Search Standards

Filters should help users narrow work without becoming the page.

## Default Filters

Default filter bars should usually include:

- Search
- Status
- One domain-specific filter
- Clear and Apply actions

## Advanced Filters

Move low-frequency filters into `AdvancedFilters` or another progressive disclosure pattern.

Examples:

- Creator
- Zeus
- Date ranges
- Raw IDs
- Provider-specific fields
- Diagnostic status

## Active Filters

Show active-filter chips only when filters are applied. Always provide a clear-all path.

## Current Decisions

- Deployment advanced filters now use the shared `AdvancedFilters` pattern instead of a hand-rolled details block.
