# Phase 4 Discord UAT Plan

Use safe test guilds and test accounts only.

## Tester Groups

- Community Member
- Patrol Leader
- Unit Leader
- S3
- Training Staff
- Moderator
- Recruiter
- Application Reviewer
- Administrator
- Developer

## Core Scenarios

1. Administrator configures Primary Community Guild.
2. Administrator configures one Unit guild.
3. Administrator runs guild discovery.
4. Developer runs `npm run discord:platform:preflight`.
5. Developer registers commands in test guild.
6. Member tests `/help`, `/profile`, `/events`, `/apply list`, and `/apply status`.
7. Patrol Leader creates a Patrol from Discord and submits AAR continuation.
8. Training Staff previews qualification role automation.
9. Administrator sends controlled multi-guild communication.
10. S3 previews scheduled event publication.
11. Moderator previews and executes a safe test moderation action.
12. Reviewer starts and reviews a Recruit application through Portal continuation.
13. Reviewer verifies RASP 30-day eligibility.
14. Member verifies transfer restrictions for Command and Detachment 7.
15. Developer stops Gateway and verifies webhook commands still work.

## Evidence Required

Record command, tester, guild, expected result, actual result, screenshot or log reference, and whether the scenario blocks release.
