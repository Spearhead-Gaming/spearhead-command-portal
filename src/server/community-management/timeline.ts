import { prisma } from "@/server/database/client";

export async function addCaseTimelineEntry(input: {
  actorUserId?: string | null;
  body?: string | null;
  caseId: string;
  entryType: string;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  title: string;
  visibility?: string;
}) {
  return prisma.caseTimelineEntry.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      body: input.body ?? null,
      caseId: input.caseId,
      entryType: input.entryType,
      relatedEntityId: input.relatedEntityId ?? null,
      relatedEntityType: input.relatedEntityType ?? null,
      title: input.title,
      visibility: input.visibility ?? "staff",
    },
  });
}
