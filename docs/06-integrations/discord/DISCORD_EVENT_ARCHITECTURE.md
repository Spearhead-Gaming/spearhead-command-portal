# Discord Event Architecture

The event-management layer lives under `src/server/discord/event-management/`.

## Services

- `policy.ts`: per-guild event integration policy.
- `routing.ts`: target guild resolution.
- `planner.ts`: deterministic preview and persisted plan creation.
- `validator.ts`: entity type, channel, date, and policy checks.
- `publisher.ts`: idempotent Discord REST execution.
- `reconciliation.ts`: Gateway-observed drift handling.
- `participation.ts`: non-authoritative interest observations.
- `queries.ts`: admin overview data.
- `rules.ts`: rule-engine integration points.
- `recommendations.ts`: advisory recommendations.
- `widgets.ts`: widget registry definitions.

## Boundary

Portal event services should call this layer rather than calling Discord REST directly.
