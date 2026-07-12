# Operational Week Planning Workflow

## Guided Order

1. Define Commander's Intent.
2. Schedule Weekend Operation.
3. Complete planning context.
4. Complete Weekly Tasking.
5. Complete Unit Taskings.
6. Attach CONOP.
7. Confirm resources.
8. Assign Zeus.
9. Review readiness.
10. Preview and publish.

## UX Rules

- Show current Deployment and Week before forms.
- Keep Commander's Intent prominent.
- Use one Unit Tasking editor per unit instead of rendering every unit as one giant form.

## Discord Scheduled Event Boundary

- Weekend Operations may generate Discord Scheduled Event plans after the Portal event exists.
- Discord Scheduled Event creation/update uses the Discord Event Management service and REST execution.
- Operation Release publishing, Discord Scheduled Event synchronization, and channel communications record independent results.
- A Discord Scheduled Event failure must not roll back an Operations Release.
- Use direct links from blockers to the corrective section.
- Do not duplicate readiness calculations in UI components.
