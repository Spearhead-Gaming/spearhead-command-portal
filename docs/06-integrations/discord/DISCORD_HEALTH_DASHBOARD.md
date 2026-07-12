# Discord Health Dashboard

The Discord Health Dashboard summarizes operational health across all managed guilds.

## Health Categories

- REST
- Gateway
- Interactions
- Permissions
- Synchronization
- Configuration
- Automation readiness

## Health Score

The first health score is intentionally simple and transparent.

Signals include:

- active/disabled guild status
- REST status
- interaction status
- Gateway state when enabled
- primary guild channel mappings
- member sync presence
- role mapping presence

Scores are advisory. They do not authorize access.

## Display

Health appears in:

- Operations Center widgets
- Guild Directory
- Guild Inspector
- Recommendations

## Future Work

Future epics may add live Discord permission checks, command registration verification, endpoint probes, and rate-limit tracking.
