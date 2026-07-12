# Discord Gateway Health

Gateway health summarizes the optional worker, not the entire Discord integration.

## Signals

- enabled state
- connection status
- bot username
- guild count
- enabled intents
- last connection and event timestamps
- latency
- reconnect count
- recent events
- failed events
- processed, skipped, failed, and stale queue counts
- handler registry metadata
- rule-based recommendations

## Important Distinction

Slash commands, buttons, modals, and REST notification delivery can work while Gateway health is degraded or disabled. The Gateway worker is only required for real-time observation workflows.

## Commands

```powershell
npm run gateway:health
npm run gateway:diagnostics
```
