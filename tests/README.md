# Test Foundation

The production hardening baseline keeps automated tests lightweight until a runner is selected, while documenting the suites that should protect the release candidate.

Recommended first runner stack:

- Vitest for service/helper tests.
- React Testing Library for component behavior and accessibility assertions.
- Playwright for authenticated route smoke tests once stable test credentials exist.

Initial coverage targets:

- Permission helpers never authorize by role name.
- Services validate input before Prisma writes.
- Notification and Discord delivery failures do not block core workflows.
- Member display names and optional ranks render consistently.
- Route-level error, loading, empty, and forbidden states remain usable.

Use the examples in this folder as implementation starting points when the test dependencies are added.
