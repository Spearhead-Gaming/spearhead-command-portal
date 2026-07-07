import { cache } from "react";
import { redirect } from "next/navigation";

import type {
  AuthenticatedPortalSession,
  PortalSession,
} from "@/features/auth/types";
import { getCurrentUser } from "@/server/auth/current-user";

export const getPortalSession = cache(async (): Promise<PortalSession> => {
  const user = await getCurrentUser();

  if (!user) {
    return {
      mode: "unauthenticated",
      authReady: true,
      discordReady: true,
      user: null,
    };
  }

  return {
    mode: "authenticated",
    authReady: true,
    discordReady: true,
    user,
  };
});

export async function requirePortalSession(): Promise<AuthenticatedPortalSession> {
  const session = await getPortalSession();

  if (session.mode !== "authenticated") {
    redirect("/login");
  }

  return session;
}
