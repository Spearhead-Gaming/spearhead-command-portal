# Testing

## Testing Goals

- Protect core workflows
- Prevent permission regressions
- Validate service logic
- Validate Discord interaction handling

## Recommended Tests

- Permission checks
- Roster assignment
- Qualification awarding
- Attendance status updates
- Campaign creation
- Notification routing

## Test Folder Baseline

```text
tests/
  components/
  integration/
  services/
```

The current repository includes example test files only. Add Vitest, React Testing Library, and Playwright dependencies before enabling automated test scripts in CI.

## Release-Candidate Verification

Run before handoff:

```bash
npm run prisma:validate
npm run lint
npm run typecheck
npm run build
```

Or use the aggregate script:

```bash
npm run check
```

## Manual QA

Before release, test:
- Discord login
- Member dashboard
- Unit dashboard
- Roster update
- Qualification assignment
- Event RSVP
- Attendance recording
