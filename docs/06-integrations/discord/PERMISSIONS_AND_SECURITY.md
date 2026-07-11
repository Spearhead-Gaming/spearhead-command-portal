# Discord Permissions and Security

## 1. Purpose

Discord interactions must follow the same security model as the portal.

## 2. Permission Source

Portal permissions are authoritative.

Discord roles alone should not grant portal authority unless mapped and validated through the portal.

Discord user ID is the canonical external identity for account linking. Imported guild members and Discord OAuth users must resolve to the same portal `User` and `MemberProfile` when the Discord ID matches.

Discord identity sync may update:

- Discord user ID
- Discord username/display name
- Discord avatar
- Discord link/guild presence state

Discord identity sync must not update:

- unit assignment
- position
- profile status
- qualifications
- attendance
- permissions or roles

Bot accounts are excluded from member sync by default. `SYNC_DISCORD_BOTS=false`
is the safe default; skipped bots are counted in sync logs for visibility and
must not create `User` or `MemberProfile` records.

Operators review identity health from Administration -> Discord -> Identity
Sync. That surface uses `discord.identity.view` for diagnostics,
`discord.members.sync` for manual guild sync, and `discord.identity.merge` for
exact Discord ID duplicate merge actions.

## 3. Interaction Permission Rules

Every Discord command or button must:

1. Resolve Discord user.
2. Find linked portal user.
3. Find linked member profile if required.
4. Check portal permission.
5. Check unit scope if applicable.
6. Execute action.
7. Log/audit if required.

## 4. Public vs Ephemeral Responses

Use ephemeral responses for:

- profile lookups
- qualification lookups
- permission denials
- personal RSVP confirmation
- errors

Use public responses for:

- event announcements
- campaign announcements
- approved official announcements
- staff-visible alert messages in staff channels

## 5. Sensitive Information

Never post these publicly:

- private profile notes
- disciplinary records
- restricted intel
- private staff discussion
- hidden audit details
- permission management details

## 6. Outbound Delivery Rule

Domain modules should not send directly to Discord. Outbound portal-to-Discord
communication should flow through:

```text
Domain Service -> Communication Service -> Delivery Provider -> Delivery Record
```

The Discord channel provider must resolve destinations through configured
channel mappings. It must never guess a channel, and missing mappings should
produce a failed delivery record visible in the Communications Center.

## 7. Bot Permission Requirements

Bot may need:

- Send Messages
- Embed Links
- Use Slash Commands
- Read Message History
- Manage Roles, only for role sync
- Manage Nicknames, only for nickname sync
- Send Messages in Threads, if thread workflows are added

For moderation-specific provider behavior, see [DISCORD_MODERATION.md](DISCORD_MODERATION.md).

## 8. Signature and Verification

Discord interactions must be verified according to Discord's interaction security requirements.

## 9. Audit Requirements

Audit:

- staff command usage
- approval button actions
- role sync actions
- channel mapping changes
- OAuth user linked to imported Discord identity
- guild sync identity updates
- exact Discord ID duplicate merges
- failed permission attempts for sensitive actions, optional

Duplicate cleanup must merge only exact Discord ID matches automatically. Display-name matches are informational warnings for staff review.

## 10. Duplicate Merge Safety

Exact Discord ID merge must preserve operational history. The merge preview and
action should keep roster assignments, qualifications, attendance, applications,
submission comments, approval decisions, AAR ownership, notification deliveries,
and audit history available. Duplicate users/profiles are archived or marked
inactive instead of hard-deleted.
