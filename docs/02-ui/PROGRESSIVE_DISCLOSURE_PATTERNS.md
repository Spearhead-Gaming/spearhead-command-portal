# Progressive Disclosure Patterns

Progressive disclosure keeps the command portal powerful without exposing every control at once.

## Canonical Components

- `NeedsAttention`: actionable problems with severity, affected entity, reason, and one direct action.
- `CollapsibleSection`: secondary analytics, diagnostics, history, advanced filters, and implementation details.
- `SummaryCard`: one key value plus short context.
- `CompactMetric`: small supporting metric inside a larger card.
- `AdvancedFilters`: optional filters that should not dominate the page.
- `MetadataList`: compact record facts.
- `RecentActivityPreview`: capped activity list.
- `InspectorSummary`: summary block for drawers and detail panels.
- `InlineIssue`: local warning inside a section.
- `StatusSummary`: compact status group.
- `DetailTabs`: lightweight anchor-style detail navigation.

## Pattern Selection

Use expandable sections before modals when the user is staying in context.

Use inspector drawers for object details from a table or card.

Use dedicated workflow pages for complex planning and publishing workflows.

Keep history, audit, raw payloads, and diagnostics collapsed unless the page is specifically a diagnostic page.
