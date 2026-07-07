# API Architecture

## API Style

Use internal Next.js API routes or server actions for application operations.

The API should be organized around domain resources.

## Example Routes

```text
/api/members
/api/members/:id
/api/units
/api/units/:id/roster
/api/qualifications
/api/events
/api/events/:id/attendance
/api/campaigns
/api/discord/interactions
```

## API Rules

- Validate all inputs
- Check permissions server-side
- Use service functions for business logic
- Return consistent errors
- Never trust client-side authorization
- Log important administrative actions

## Future Public API

API clients may be added later.

Do not expose public API access in the MVP unless required.
