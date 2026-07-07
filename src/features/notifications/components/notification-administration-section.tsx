import { can } from "@/server/permissions/access";
import {
  createSamplePortalNotificationAction,
  requestNotificationDeliveryRetryAction,
} from "@/server/notifications/actions";
import { notificationTypeCatalog } from "@/server/notifications/constants";
import { getNotificationDeliveryOverviewForUser } from "@/server/notifications/queries";
import { getCurrentUser } from "@/server/auth/current-user";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterBar } from "@/components/data/filter-bar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getDeliveryTone(status: string) {
  switch (status) {
    case "failed":
      return "danger";
    case "retrying":
      return "warning";
    case "sent":
      return "success";
    default:
      return "info";
  }
}

export async function NotificationAdministrationSection() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const canSend = can(user, "notifications.send");
  const canViewDelivery = can(user, "notifications.delivery.view");
  const canRetry = can(user, "notifications.delivery.retry");
  const overview = canViewDelivery
    ? await getNotificationDeliveryOverviewForUser(user)
    : null;

  if (!canSend && !canViewDelivery) {
    return (
      <Card className="border-border/70 bg-card/78">
        <CardHeader>
          <CardTitle>Notifications foundation</CardTitle>
          <CardDescription>
            This administration section becomes available once notification permissions are granted.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <Card className="border-border/70 bg-card/78">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label="Milestone 11" tone="info" />
                <StatusBadge
                  label={canViewDelivery ? "Delivery Tracking Live" : "Send-Only Access"}
                  tone={canViewDelivery ? "success" : "warning"}
                />
              </div>
              <CardTitle>Notifications foundation</CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-7">
                Portal notification records and delivery tracking are now database-backed. External
                Discord delivery still remains intentionally placeholder-only in this milestone.
              </CardDescription>
            </div>
            {canSend ? (
              <form action={createSamplePortalNotificationAction} className="flex flex-wrap gap-3">
                <select
                  className="flex h-10 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  defaultValue={notificationTypeCatalog[0].key}
                  name="type"
                >
                  {notificationTypeCatalog.map((type) => (
                    <option key={type.key} value={type.key}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <Button type="submit">Create Sample Portal Notification</Button>
              </form>
            ) : null}
          </div>
          <FilterBar
            filters={["Status", "Channel", "Recipient", "Notification Type"]}
            supports={[
              "Unread count",
              "Portal list",
              "Failed delivery audit",
              "Retry placeholder",
            ]}
          />
        </CardHeader>
      </Card>

      {overview?.enabled ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              hint="Portal and future external records waiting for delivery."
              label="Pending"
              tone="info"
              value={String(overview.summary.pending)}
            />
            <KpiCard
              hint="Deliveries written successfully, including portal notifications."
              label="Sent"
              tone="success"
              value={String(overview.summary.sent)}
            />
            <KpiCard
              hint="Records marked for manual retry while send workers remain deferred."
              label="Retrying"
              tone="warning"
              value={String(overview.summary.retrying)}
            />
            <KpiCard
              hint="Final failure count. These should be visible without blocking the originating workflow."
              label="Failed"
              tone="danger"
              value={String(overview.summary.failed)}
            />
          </section>

          <Card className="border-border/70 bg-card/78">
            <CardHeader>
              <CardTitle>Recent delivery records</CardTitle>
              <CardDescription>
                Portal notifications are first-class records now. Discord and email remain queued as
                future delivery channels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview.recentDeliveries.length === 0 ? (
                <EmptyState
                  description="Use the sample action above or wait for future workflow hooks to start generating delivery records."
                  title="No delivery records yet"
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Notification</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.recentDeliveries.map((delivery) => (
                      <TableRow key={delivery.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">
                              {delivery.notificationTitle}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Created {delivery.createdAtLabel}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{delivery.notificationType}</TableCell>
                        <TableCell>{delivery.channelType}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>{delivery.destinationKey}</p>
                            {delivery.recipientLabel ? (
                              <p className="text-xs text-muted-foreground">
                                Recipient {delivery.recipientLabel}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <StatusBadge
                              label={delivery.status}
                              tone={getDeliveryTone(delivery.status)}
                            />
                            {delivery.errorMessage ? (
                              <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                                {delivery.errorMessage}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{delivery.deliveredAtLabel ?? "Not sent"}</TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p>{delivery.updatedAtLabel}</p>
                            <p className="text-xs text-muted-foreground">
                              Retry count {delivery.retryCount}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {delivery.status === "failed" && canRetry ? (
                            <form action={requestNotificationDeliveryRetryAction}>
                              <input name="deliveryId" type="hidden" value={delivery.id} />
                              <Button size="sm" type="submit" variant="outline">
                                Retry Placeholder
                              </Button>
                            </form>
                          ) : (
                            <StatusBadge
                              label={delivery.status === "sent" ? "Delivered" : "No action"}
                              tone={delivery.status === "sent" ? "success" : "muted"}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/78">
            <CardHeader>
              <CardTitle>Failed delivery focus</CardTitle>
              <CardDescription>
                Final failures should stay visible to administrators while core portal workflows keep
                moving forward.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview.failedDeliveries.length === 0 ? (
                <EmptyState
                  description="No final delivery failures are recorded yet. Retry placeholders and admin alerts are ready when failures begin to appear."
                  title="No failed deliveries"
                />
              ) : (
                <div className="space-y-3">
                  {overview.failedDeliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="rounded-2xl border border-danger/30 bg-danger/10 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">
                            {delivery.notificationTitle}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {delivery.destinationKey} via {delivery.channelType}
                          </p>
                        </div>
                        <StatusBadge label="Failed" tone="danger" />
                      </div>
                      {delivery.errorMessage ? (
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {delivery.errorMessage}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}
