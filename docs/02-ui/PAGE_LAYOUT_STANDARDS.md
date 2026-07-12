# Page Layout Standards

## PageContainer Variants

| Variant | Use For |
| --- | --- |
| `standard` | Simple admin or content pages |
| `wide` | Default authenticated workspace pages |
| `full-width` | Matrices, planning boards, dense workspaces |
| `focused-workflow` | Guided creation/review workflows |

## PageHeader Rules

- One page title.
- One concise description.
- One obvious primary action.
- Secondary actions grouped to the right on desktop and wrapped below on mobile.
- Breadcrumbs use canonical user-facing terminology.
- Status badges must not compete with the title.
- Avoid duplicating the page title inside the first card.

## Page Action Placement

| Action Type | Location |
| --- | --- |
| Global actions | Top bar |
| Page primary action | PageHeader |
| Row/object action | Inspector drawer or row action menu |
| Destructive action | Confirm modal or danger section |
| Multi-step workflow | Dedicated workflow page |

## Scroll Ownership

- App shell owns viewport.
- Main content owns page scroll.
- Drawers and modals own internal scroll.
- Tables should use overflow-safe wrappers only when compact alternatives are not practical.
