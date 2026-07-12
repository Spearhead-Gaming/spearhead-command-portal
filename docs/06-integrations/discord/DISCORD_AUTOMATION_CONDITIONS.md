# Discord Automation Conditions

## Purpose

Conditions keep automation explicit and reviewable. They are stored as JSON on `DiscordAutomationDefinition` and interpreted by the service layer.

## Initial Condition Types

- member has linked Discord identity.
- member belongs to unit.
- member holds position.
- member status equals expected state.
- qualification active.
- qualification not expired.
- guild enabled.
- guild associated with member unit.
- target role exists.
- target role manageable.
- member present in guild.
- mapping enabled.
- manual approval granted.

## Safety Behavior

Unknown or unsupported conditions should be treated conservatively. If a condition cannot be evaluated safely, the engine should block or require review rather than run a Discord action.

## Future Extension

Future workflows may add expression-style conditions, but condition evaluation must remain server-side and must not authorize from Discord role names.

