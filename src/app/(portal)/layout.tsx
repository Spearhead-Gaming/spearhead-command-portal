import { AppShell } from "@/components/layout/app-shell";
import { RouteGuardBanner } from "@/components/shared/route-guard-banner";
import { requirePortalSession } from "@/server/auth/get-portal-session";
import { getNotificationCenterDataForUser } from "@/server/notifications/queries";
import { getSelectedWorkspacePreference, resolveWorkspaceProfile } from "@/server/personas";

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requirePortalSession();
  const [notificationCenter, selectedWorkspace] = await Promise.all([
    getNotificationCenterDataForUser(session.user),
    getSelectedWorkspacePreference(),
  ]);
  const workspaceProfile = resolveWorkspaceProfile(session.user, selectedWorkspace);

  return (
    <AppShell
      environment={process.env.APP_ENV ?? process.env.NODE_ENV}
      notificationCenter={notificationCenter}
      session={session}
      workspaceProfile={workspaceProfile}
    >
      <RouteGuardBanner session={session} />
      {children}
    </AppShell>
  );
}
