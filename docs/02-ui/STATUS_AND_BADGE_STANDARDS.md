# Status And Badge Standards

Badges are semantic signals, not decoration.

## Canonical Tones

| Tone | Meaning |
| --- | --- |
| `info` | Informational or active context |
| `success` | Ready, healthy, complete, sent |
| `warning` | Pending, incomplete, needs review |
| `danger` | Failed, blocked, destructive risk |
| `muted` | Archived, inactive, secondary |

## Shared Status Mapping

| Status | Preferred tone |
| --- | --- |
| Draft | `muted` |
| Planning | `info` |
| Ready | `success` |
| Active / Running | `info` |
| Awaiting Review | `warning` |
| Blocked | `danger` |
| Published | `success` |
| Completed | `success` |
| Archived | `muted` |
| Failed | `danger` |
| Cancelled | `danger` or `muted` depending on severity |

## Rules

- Keep labels concise.
- Do not use badge overload for long metadata.
- Status must also be understandable from text.
- Use domain wrappers like `UnitBadge` and `QualificationBadge` when the meaning is domain-specific.

