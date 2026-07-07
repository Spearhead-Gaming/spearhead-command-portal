import { AppShell } from "@/components/layout/app-shell";
import { RouteGuardBanner } from "@/components/shared/route-guard-banner";
import { requirePortalSession } from "@/server/auth/get-portal-session";
import { getNotificationCenterDataForUser } from "@/server/notifications/queries";

export default async function PortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requirePortalSession();
  const notificationCenter = await getNotificationCenterDataForUser(session.user);

  return (
    <AppShell notificationCenter={notificationCenter} session={session}>
      <RouteGuardBanner session={session} />
      {children}
    </AppShell>
  );
}
