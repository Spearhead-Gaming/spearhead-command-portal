# Discord Recommendations

Discord recommendations tell administrators what to fix next.

## Examples

- Guild inventory has not been discovered.
- Primary guild has no channel mappings.
- Discovered channels are not mapped.
- Discovered roles are ready for review.
- REST health is degraded.
- Interaction health needs review.
- Gateway state is degraded.

## Rules

Recommendations should:

- be actionable
- link to the relevant management area
- avoid exposing secrets
- never grant permissions
- never trigger destructive actions automatically

## Severity

Supported severities:

- `info`
- `warning`
- `danger`

Recommendations are advisory and should not block core portal workflows unless a user explicitly requests Discord delivery or automation as a required action.
