# Workspace Architecture

Workspaces are presentation contexts derived from applicable personas.

## Workspace List

- My Portal
- Patrol Leader
- Unit Leadership
- Personnel
- Operations
- Deployment Creator
- Zeus
- Training
- Command
- Community
- Administration
- Developer

## Behavior

- The App Shell receives a resolved workspace profile from the server.
- The Top Bar shows a compact workspace switcher only when multiple workspaces apply.
- The Sidebar reorders navigation groups by workspace relevance after permission filtering.
- The Dashboard uses the workspace profile to prioritize KPI cards, quick actions, and My Work.

## Automatic Mode

Automatic mode follows the resolver's primary persona recommendation. It is the default when no workspace cookie exists.

## Route Safety

Workspace switching redirects to the selected workspace default route only when the switcher is used. Deep links remain valid and are not redirected away solely because another persona is selected.
