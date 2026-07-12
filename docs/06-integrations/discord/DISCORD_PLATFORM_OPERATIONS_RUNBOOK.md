# Discord Platform Operations Runbook

## Daily Checks

1. Open Administration -> Discord.
2. Review Platform Readiness.
3. Review release blockers.
4. Review failed deliveries.
5. Review Gateway failed events if Gateway is enabled.
6. Review reconciliation items.

## Before Enabling a Guild

1. Bootstrap or create the guild record.
2. Run discovery.
3. Configure channel mappings.
4. Configure role mappings only for roles the Portal may manage.
5. Run `npm run discord:platform:preflight`.
6. Certify the guild capability by capability.

## Before Enabling Automation

1. Keep automation Preview Only.
2. Verify identity linking.
3. Verify role mapping.
4. Verify role hierarchy.
5. Preview role action.
6. Approve controlled test.
7. Only then consider automatic mode.
