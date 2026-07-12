# Persona Resolution

Personas are presentation profiles. They do not grant access.

The Portal still authorizes with permission keys, scoped grants, and route guards. Persona resolution only decides what appears first, which workspace is selected, which dashboard widgets are emphasized, and which quick actions are shown.

## Resolver Inputs

- Portal permission grants.
- Linked member and unit context already present on the authenticated portal user.
- Explicit workspace preference when the user selects a workspace.
- Automatic mode when no workspace preference is stored.

The current implementation does not infer sensitive access from Discord roles, role names, rank, position label, display name, or unit name.

## Resolver Outputs

- Applicable personas.
- Primary persona recommendation.
- Available workspaces.
- Selected workspace.
- Dashboard profile.
- Quick actions.
- Default route for explicit workspace switching.

## Primary Persona

The resolver is deterministic. Developer and administrator workspaces have the highest presentation priority, followed by command, operations, deployment creator, community, Zeus, training, personnel, unit leadership, patrol leader, and member workspace.

Primary persona is a recommendation only. A user can switch to another applicable workspace without changing permissions.

## Security Rules

- Persona selection never bypasses route guards.
- Invalid workspace selections fall back safely.
- Developer workspace requires explicit developer-style permissions.
- Administrator workspace requires existing administration permissions.
- Critical cross-domain alerts may remain visible when the user has permission and ownership relevance.

## Persistence

Workspace preference is stored as a secure HTTP-only cookie. Selecting `Automatic` clears the cookie and returns to deterministic primary persona selection.

No schema changes were introduced for Phase 3 Epic 4.
