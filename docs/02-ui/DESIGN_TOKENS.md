# Design Tokens

The Portal uses Tailwind classes backed by semantic CSS variables in `src/app/globals.css`.

## Surface Tokens

| Token | Use |
| --- | --- |
| `background` | App shell and page background |
| `card` | Primary elevated panels |
| `secondary` | Muted controls and secondary panels |
| `input` | Form controls |
| `border` | Default dividers and panel borders |

## Semantic Status Tokens

| Token | Use |
| --- | --- |
| `primary` | Primary action and focus accent |
| `info` | Informational state |
| `success` | Ready, completed, healthy, confirmed |
| `warning` | Needs review, pending, incomplete |
| `danger` / `destructive` | Failed, blocked, destructive |
| `muted` | Archived, secondary, low emphasis |

## Radius And Density

- Standard controls use `rounded-lg`.
- Cards and panels use `rounded-2xl`.
- Compact row cards use `rounded-xl`.
- Avoid route-specific arbitrary radius unless matching a specialized shell.

## Focus And Motion

- Focus-visible rings should use `outline-ring`.
- Transitions should be short and restrained.
- Reduced motion should be respected when adding new animation.

## Avoid

- Hard-coded hex colors in route components.
- New z-index values without a shell or overlay reason.
- One-off shadows where a border and surface token are enough.
- Arbitrary spacing values that duplicate existing layout primitives.

