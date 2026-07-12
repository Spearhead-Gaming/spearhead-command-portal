"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/auth/current-user";
import { getWorkspaceDefaultRoute, isWorkspaceAllowed, resolveWorkspaceProfile } from "@/server/personas/resolver";
import { setSelectedWorkspacePreference } from "@/server/personas/preferences";
import type { WorkspaceId } from "@/server/personas/types";

export async function selectWorkspaceAction(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const user = await getCurrentUser();

  if (!user || (workspaceId !== "automatic" && !isWorkspaceAllowed(user, workspaceId))) {
    redirect("/dashboard");
  }

  await setSelectedWorkspacePreference(workspaceId);

  const profile = resolveWorkspaceProfile(user, workspaceId);
  const redirectWorkspaceId =
    workspaceId === "automatic" ? profile.primaryPersona.workspaceId : (workspaceId as WorkspaceId);

  redirect(getWorkspaceDefaultRoute(profile, redirectWorkspaceId));
}
