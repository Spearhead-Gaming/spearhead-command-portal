# Plesk Staging Smoke Test

Run this after every staging deploy.

## Automated Checks

```bash
npm run staging:verify
```

Expected:

- `/api/health/live` returns HTTP 200.
- `/api/health/ready` returns HTTP 200.
- Readiness reports database and file storage as `ok`.

## Manual Checks

- Visit the staging domain over HTTPS.
- Confirm the staging banner is visible after login.
- Confirm unauthenticated users are redirected to login.
- Log in with Discord OAuth.
- Confirm the dashboard renders.
- Confirm the notification center opens.
- Confirm a deployment/operation page renders.
- Confirm a deployment resource download route works when a resource exists.
- Confirm Discord settings page renders.
- If Discord interactions are configured, test `/help` in the staging guild.
- If Gateway is enabled, confirm `npm run discord:gateway:health` reports connected status.

## Discord Event Smoke

- Register guild commands with staging credentials.
- Confirm commands appear in the staging guild.
- Verify the interaction endpoint in Discord Developer Portal.
- Send one test interaction that returns an ephemeral response.
- Confirm no secret values appear in logs.

## File Storage Smoke

- Upload or replace a staging-only deployment resource.
- Confirm it can be downloaded.
- Confirm the file appears under the persistent `uploads` volume.

## Failure Criteria

Do not promote if:

- health readiness fails
- OAuth cannot complete
- dashboard fails to render
- uploads cannot be written
- Discord interaction endpoint rejects PING
- migrations are pending unexpectedly
