# Drawer and Modal Standards

## Inspector Drawer Sizes

| Size | Use For |
| --- | --- |
| `standard` | Short object detail and action panels |
| `wide` | Member, deployment, patrol, application inspectors |
| `extra-wide` | Complex records that need tabs and dense context |

All inspector drawers become full-width mobile overlays.

## Drawer Requirements

- Fixed viewport overlay.
- Background interaction disabled.
- Escape closes.
- Focus trapped while open.
- Focus restored after close.
- Internal scroll region.
- Visible close control.
- Accessible title and description.
- Consistent z-index above shell and below critical system overlays.

## Modal Categories

| Category | Use For |
| --- | --- |
| Compact Action Modal | Confirmations and short status changes |
| Standard Form Modal | Small create/edit workflows |
| Wide Form Modal | Moderate multi-section forms |
| Dedicated Workflow Page | Operations Package, role builder, case review, large planning flows |

Do not place complex planning or review workflows inside undersized modals.
