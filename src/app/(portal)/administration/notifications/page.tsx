import { PageHeader } from "@/components/layout/page-header";
import { NotificationAdministrationSection } from "@/features/notifications/components/notification-administration-section";
import { requirePermission } from "@/server/permissions/access";

export default async function AdministrationNotificationsPage() {
  await requirePermission("notifications.delivery.view");

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Administration", "Notifications"]}
        description="Review notification delivery state, inspect failures, and request delivery retries without deleting notification, delivery, or audit history."
        title="Notification Deliveries"
      />
      <NotificationAdministrationSection />
    </div>
  );
}
