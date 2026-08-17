import { PlaceholderRoutePage } from "@/components/shared/placeholder-route-page";
import { AdministrationRolesRealPage } from "@/features/administration/components/roles-page";
import { AdministrationUsersRealPage } from "@/features/administration/components/users-page";
import { administrationPageConfigs } from "@/features/administration/config";
import { DiscordSettingsPage } from "@/features/administration/components/discord-settings-page";
import { SystemSettingsPage } from "@/features/administration/components/system-settings-page";
import { NotificationAdministrationSection } from "@/features/notifications/components/notification-administration-section";


export function AdministrationPage() {
  return (
    <>
      <PlaceholderRoutePage config={administrationPageConfigs.overview} />
      <NotificationAdministrationSection />
    </>
  );
}

export async function AdministrationUsersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdministrationUsersRealPage searchParams={searchParams} />;
}

export async function AdministrationRolesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <AdministrationRolesRealPage searchParams={searchParams} />;
}

export async function AdministrationDiscordPage() {
  return <DiscordSettingsPage />;
}

export function AdministrationAuditLogsPage() {
  return <PlaceholderRoutePage config={administrationPageConfigs.auditLogs} />;
}

export async function AdministrationSettingsPage() {
  return <SystemSettingsPage />;
}
