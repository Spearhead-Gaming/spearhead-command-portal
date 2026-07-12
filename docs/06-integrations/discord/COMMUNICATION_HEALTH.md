# Communication Health

## Health Signals

Communication health evaluates:

- domain mapping coverage.
- failed deliveries.
- pending queue depth.
- retry backlog.
- missing templates.
- missing channels.
- provider failures.
- rate-limit or Discord API degradation indicators.

## Rule Provider

`src/server/communications/rules.ts` exposes a communication platform rule provider.

Initial rules:

- missing domain mappings.
- failed deliveries.
- queue backlog.
- healthy baseline.

## Recommendations

Missing mappings or repeated failures should become recommendations for administrators. Recommendations should point to the Discord Operations Center routing and delivery inspector rather than silently failing.

