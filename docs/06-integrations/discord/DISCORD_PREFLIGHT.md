# Discord Preflight

Run the consolidated preflight before staging or production Discord rollout.

```powershell
npm run discord:platform:preflight
```

## Scope

Preflight checks:

- environment variable presence without printing secrets
- OAuth configuration
- bot token presence
- application ID shape
- public key presence
- public interaction endpoint shape
- Primary Community Guild count
- active mappings
- role automation mapping safety
- Gateway optional state
- application catalog readiness
- duplicate identity state
- discovery freshness
- failed deliveries

Preflight is read-only. It does not register commands, send messages, mutate roles, create events, or moderate users.
