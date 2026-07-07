import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/current-user";
import { prisma } from "@/server/database/client";
import { can } from "@/server/permissions/access";
import { readDeploymentResourceFile } from "@/server/storage/deployment-resource-storage";

function encodeFileName(fileName: string) {
  return encodeURIComponent(fileName).replaceAll("'", "%27").replaceAll("(", "%28").replaceAll(")", "%29");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  const [resolvedParams, user] = await Promise.all([params, getCurrentUser()]);
  const { versionId } = resolvedParams as { versionId: string };

  if (!user || !can(user, "deployments.resources.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const version = await prisma.deploymentResourceVersion.findUnique({
    where: { id: versionId },
    include: {
      resource: true,
    },
  });

  if (!version || !version.storageKey || version.sourceType !== "file" || version.resource.isArchived) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canViewHistory =
    can(user, "deployments.resources.upload") ||
    can(user, "deployments.resources.edit") ||
    can(user, "deployments.resources.delete") ||
    can(user, "deployments.edit") ||
    can(user, "audit.view");

  if (!version.isCurrent && !canViewHistory) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (version.resource.visibility !== "members" && !canViewHistory) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const file = await readDeploymentResourceFile(version.storageKey);
  const fileName = version.originalFileName ?? "deployment-resource";

  return new Response(file.bytes, {
    headers: {
      "Cache-Control": "private, max-age=60",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeFileName(fileName)}`,
      "Content-Length": String(file.size),
      "Content-Type": version.mimeType ?? "application/octet-stream",
      "Last-Modified": file.lastModified.toUTCString(),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
