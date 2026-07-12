# Button And Action Standards

Buttons must make action hierarchy obvious and predictable.

## Canonical Variants

| Variant | Use |
| --- | --- |
| `default` | Primary action in a region |
| `secondary` | Secondary non-critical action |
| `outline` | Navigation-adjacent or alternate action |
| `ghost` | Low-emphasis contextual action |
| `destructive` | Destructive or irreversible action |
| `warning` | High-friction warning action, not destructive |
| `success` | Confirmed positive action when semantically justified |
| `link` | Text link presentation for button-compatible cases |

## Placement

- One primary button per action region.
- Put secondary actions after the primary action.
- Separate destructive actions into an overflow menu, confirmation dialog, or danger zone.
- Use `ActionGroup` for wrapping behavior.
- Use links for navigation and buttons for state-changing actions.

## Accessibility

- Icon-only buttons need accessible labels.
- Disabled actions should explain why.
- Loading buttons should preserve width where practical.
- Avoid nested clickable elements.

