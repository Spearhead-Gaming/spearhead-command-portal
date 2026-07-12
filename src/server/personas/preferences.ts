import { cookies } from "next/headers";

const workspaceCookieName = "scp_workspace";

export async function getSelectedWorkspacePreference() {
  const cookieStore = await cookies();

  return cookieStore.get(workspaceCookieName)?.value ?? null;
}

export async function setSelectedWorkspacePreference(workspaceId: string) {
  const cookieStore = await cookies();

  if (workspaceId === "automatic") {
    cookieStore.delete(workspaceCookieName);
    return;
  }

  cookieStore.set(workspaceCookieName, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}
