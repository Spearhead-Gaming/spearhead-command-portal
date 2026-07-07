import { redirect } from "next/navigation";

import type { PortalUser } from "@/features/auth/types";
import { getCurrentUser } from "@/server/auth/current-user";

export async function requireAuthenticatedUser(): Promise<PortalUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
