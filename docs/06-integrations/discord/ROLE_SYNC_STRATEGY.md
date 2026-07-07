# Discord Role Sync Strategy

## 1. Purpose

Role sync keeps Discord roles aligned with portal records.

Role sync should be added after the personnel and permission systems are stable.

## 2. Core Principle

> Portal records determine what Discord roles should be, not the other way around.

## 3. Sync Sources

Potential portal sources:

- unit assignment
- rank
- qualification
- staff role
- event role, future
- status, such as LOA

## 4. Mapping Types

### Rank Role Mapping

Portal rank maps to Discord role.

### Unit Role Mapping

Portal unit maps to Discord role.

### Qualification Role Mapping

Portal qualification maps to Discord role.

### Staff Role Mapping

Portal role maps to Discord role.

## 5. Sync Modes

### Manual Sync

Admin triggers sync.

Best for MVP/later early testing.

### Event-Based Sync

Runs after:

- rank change
- unit change
- qualification awarded/revoked
- role assignment changed

### Scheduled Sync

Runs periodically to detect drift.

## 6. Nickname Sync

Optional and should be configurable.

Potential format:

```text
[RANK] Name
```

or

```text
[RANK] Name | Unit
```

Nickname sync should not be enabled without staff approval.

## 7. Safety Rules

- Do not remove manually assigned non-managed Discord roles.
- Only manage roles explicitly mapped in the portal.
- Log every role sync action.
- If bot lacks permissions, record failure.
- Discord failure should not roll back portal changes.
- Admin should be able to preview role changes before bulk sync.

## 8. MVP Recommendation

Do not implement automatic role sync in initial MVP.

Instead:

- build data model support
- build DiscordRoleMapping placeholder
- build manual sync plan
- implement later after roster/rank/unit data is stable
