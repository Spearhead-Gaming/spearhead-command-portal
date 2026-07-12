# Guild Health

Guild health tracks whether each managed guild can support its configured Discord workflows.

## Health Categories

- REST access
- Gateway connectivity
- Interaction webhook readiness
- synchronization health
- permissions health
- delivery routing health
- discovery freshness
- reconciliation state
- rate-limit or API failure state

## Health Records

`DiscordGuildHealthCheck` stores per-guild health checks.

Each check stores:

- check type
- status
- latency
- summary
- error message
- metadata
- checked timestamp

## Gateway Optionality

Gateway disabled is not a web-app failure. The portal must continue to function through OAuth, route handlers, REST delivery, and manual actions when Gateway is disabled.

## Readiness Interpretation

Guild health should distinguish:

- `ok`: configured and healthy
- `warning`: usable but missing recommended configuration
- `failed` or `error`: configured workflow cannot complete
- `unknown`: not checked yet

Health is diagnostic. It does not grant permissions.

Discovery health should recommend action when inventory has never been scanned, discovery is stale, mapped resources are missing, or repeated discovery failures occur.
