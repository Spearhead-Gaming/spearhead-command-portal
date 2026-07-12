# Operations Package Guided Flow

## Journey States

The reusable journey model tracks:

- Deployment created
- Resources added
- Current week opened
- Weekend Operation scheduled
- Planning completed
- Weekly Tasking completed
- Unit Taskings completed
- CONOP attached
- Zeus assigned
- Readiness reviewed
- Previewed
- Package approved
- Published
- Patrol activity
- Patrol AAR review
- Intent assessment

Each state exposes status, responsible group, blocking issues, warnings, and direct action destination.

## UI Components

- `ContextHeader`
- `NextActionCard`
- `WorkflowProgress`
- `WorkflowStep`
- `BlockingIssueSummary`
- `CompletionChecklist`
- `SaveStateIndicator`
- `TransitionActions`
- `HandoffSummary`

These components are composable and should not become a single giant workflow framework.
