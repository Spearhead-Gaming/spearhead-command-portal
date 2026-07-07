# Folder Structure

Recommended future app structure:

```text
src/
  app/
  components/
  features/
    personnel/
    units/
    qualifications/
    operations/
    campaigns/
    discord/
    admin/
  server/
    administration/
    auth/
    database/
    discord/
    notifications/
    permissions/
    services/
  lib/
  types/
prisma/
  schema.prisma
docs/
```

## Feature Folder Pattern

```text
features/personnel/
  components/
  pages/
  types.ts
  permissions.ts
```

Feature UI stays under `src/features`. Business logic and Prisma access stay under `src/server`, with `src/server/database` as the canonical database utility path. `src/server/db` is retained only as a compatibility re-export.
