# Discord Diagnostics

Diagnostics are available in Administration -> Discord and through CLI scripts.

## CLI

```powershell
npm run discord:health
npm run discord:platform:preflight
npm run discord:gateway:health
npm run discord:commands:list
```

## Operations Center Sections

- Platform Readiness
- Guild Directory
- Resource Reconciliation
- Communications
- Gateway
- Automation
- Applications
- Moderation
- Diagnostics
- Audit

## Failure Taxonomy

Configuration, Authentication, Authorization, Availability, Identity, Resource, Rate Limit, State Conflict, Storage, Provider.

Diagnostics must not expose secrets, raw tokens, or private applicant/moderation data.
