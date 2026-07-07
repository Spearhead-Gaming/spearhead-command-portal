import type { Prisma } from "@prisma/client";

import { createAuditLogEntry } from "@/server/database/repositories";

export type RecordAuditEventInput = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
  reason?: string | null;
  ipAddress?: string | null;
};

export async function recordAuditEvent(input: RecordAuditEventInput) {
  // Future auth and Discord entry points should resolve actor identity before
  // calling this service so audit logs remain transport-agnostic and append-only.
  return createAuditLogEntry(input);
}
