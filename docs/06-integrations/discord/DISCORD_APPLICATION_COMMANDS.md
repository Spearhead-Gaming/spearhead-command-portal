# Discord Application Commands

Application commands are webhook-compatible and do not require the Gateway worker.

## `/apply list`

Shows enabled application catalog entries for the current guild policy and caller eligibility context.

## `/apply info type:<type>`

Shows a concise description, eligibility summary, availability state, and next action for one application type.

## `/apply start type:<type>`

Creates an `APPLICATION_START` interaction session and returns a secure Portal continuation link when the caller is eligible or needs review.

## `/apply status`

Shows the caller's recent Portal application submissions for Discord-enabled application types. Staff notes and restricted reviewer context are never shown.

## Registration

Use local or production command registration scripts:

```powershell
npm run discord:commands:register
npm run discord:commands:list
```

Use `DISCORD_REGISTER_MODE=guild` for development and `DISCORD_REGISTER_MODE=global` for production rollout.
