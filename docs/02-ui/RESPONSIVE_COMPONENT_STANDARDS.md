# Responsive Component Standards

Design for 1440, 1280, 1024, 768, and 390px.

## Requirements

- No page-level horizontal overflow.
- Action groups wrap through `ActionGroup`.
- Tables provide contained horizontal scroll or compact alternatives.
- Drawers become full-screen overlays on mobile.
- Modals stay viewport-safe.
- Filters move to collapsible sections or sheets.
- Tabs scroll safely.
- Touch targets remain reachable.
- Long text truncates or wraps intentionally.
- No desktop-only hover dependency for critical actions.

## Preferred Fallbacks

| Desktop pattern | Mobile fallback |
| --- | --- |
| Wide table | Compact list or contained scroll |
| Side inspector | Full-screen drawer |
| Inline filters | Collapsible filter panel |
| Multi-column cards | One-column stack |
| Toolbar row | Wrapped `ActionGroup` |

