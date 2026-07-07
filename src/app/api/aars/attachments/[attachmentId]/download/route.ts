import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { can } from "@/server/permissions/access";
import { readAarAttachmentFile } from "@/server/storage/aar-attachment-storage";

function encodeFileName(fileName: string) {
  return encodeURIComponent(fileName).replaceAll("'", "%27").replaceAll("(", "%28").replaceAll(")", "%29");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  const [resolvedParams, user] = await Promise.all([params, getCurrentUser()]);
  const { attachmentId } = resolvedParams as { attachmentId: string };

  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const attachment = await prisma.aarAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      aar: {
        include: {
          campaign: {
            include: {
              events: {
                select: {
                  hostUnitId: true,
                },
              },
            },
          },
          event: {
            select: {
              hostUnitId: true,
            },
          },
        },
      },
    },
  });

  if (!attachment || attachment.aar.deletedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const scopedUnitIds = [
    attachment.aar.event?.hostUnitId,
    ...(attachment.aar.campaign?.events.map((event) => event.hostUnitId) ?? []),
  ].filter((unitId): unitId is string => Boolean(unitId));

  if (
    !can(user, "s3.aars.view") &&
    !scopedUnitIds.some((unitId) => can(user, "s3.aars.view", { unitId }))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const file = await readAarAttachmentFile(attachment.storageKey);

  return new Response(file.bytes, {
    headers: {
      "Cache-Control": "private, max-age=60",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeFileName(attachment.fileName)}`,
      "Content-Length": String(file.size),
      "Content-Type": attachment.mimeType,
      "Last-Modified": file.lastModified.toUTCString(),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
