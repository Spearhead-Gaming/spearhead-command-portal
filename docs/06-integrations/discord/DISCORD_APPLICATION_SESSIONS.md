# Discord Application Sessions

Application entry uses the reusable Discord Interaction Session Manager.

## Workflow Type

`APPLICATION_START`

## Stored Context

- Discord user ID
- optional Portal user ID
- optional member profile ID
- guild ID
- channel ID
- application type
- eligibility preview
- current step
- expiration timestamp

## Continuation Tokens

Continuation links store only a token hash in the database. The raw token is shown once in the Discord response and expires after the configured application continuation TTL.

Expired or used tokens cannot continue an application.
