import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  cancelScheduledCommunicationAction,
  createAnnouncementAction,
  ensureCommunicationTemplatesAction,
  retryAllFailedCommunicationDeliveriesAction,
  retryCommunicationDeliveryAction,
  sendAnnouncementAction,
} from "@/server/communications/actions";
import { getCommunicationCenterData } from "@/server/communications/queries";
import { formatDateTime } from "@/lib/formatters";

const inputClassName =
  "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const textareaClassName =
  "min-h-28 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const labelClassName = "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground";

function statusTone(status: string): BadgeTone {
  if (["sent", "delivered", "active"].includes(status)) {
    return "success";
  }

  if (["failed", "cancelled"].includes(status)) {
    return "danger";
  }

  if (["scheduled", "pending", "retrying"].includes(status)) {
    return "warning";
  }

  return "muted";
}

function formatPayload(payload: unknown) {
  if (!payload) {
    return "No sanitized payload stored.";
  }

  return JSON.stringify(payload, null, 2);
}

export async function CommunicationsCenterPage() {
  const data = await getCommunicationCenterData();
  const failedDeliveries = data.deliveries.filter((delivery) => delivery.status === "failed");
  const activeDeliveries = data.deliveries.filter((delivery) =>
    ["pending", "processing", "retrying"].includes(delivery.status),
  );
  const recentDeliveries = data.deliveries.slice(0, 12);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Communications"]}
        description="Centralized outbound communication history, announcements, delivery health, templates, and preferences."
        title="Communications Center"
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/80 bg-card/82">
          <CardHeader>
            <CardTitle>Total Communications</CardTitle>
            <CardDescription>Requests processed through the unified pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">{data.metrics.totalCommunications}</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/82">
          <CardHeader>
            <CardTitle>Success Rate</CardTitle>
            <CardDescription>Delivered communication delivery rows.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">
              {data.metrics.successRate === null ? "N/A" : `${data.metrics.successRate}%`}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/82">
          <CardHeader>
            <CardTitle>Failed Deliveries</CardTitle>
            <CardDescription>Failures preserve attempt history and source context.</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusBadge label={String(data.metrics.failedDeliveries)} tone={data.metrics.failedDeliveries > 0 ? "danger" : "success"} />
          </CardContent>
        </Card>
        <Card className="border-border/80 bg-card/82">
          <CardHeader>
            <CardTitle>Pending</CardTitle>
            <CardDescription>Pending, processing, or retrying deliveries.</CardDescription>
          </CardHeader>
          <CardContent>
            <StatusBadge label={String(data.metrics.pendingDeliveries)} tone={data.metrics.pendingDeliveries > 0 ? "warning" : "success"} />
          </CardContent>
        </Card>
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Communication History</CardTitle>
              <CardDescription>Permanent request history with source, category, related entity, and delivery summary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.communications.length > 0 ? (
                data.communications.map((communication) => (
                  <div key={communication.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{communication.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {communication.sourceModule} / {communication.type} / {formatDateTime(communication.createdAt)}
                        </p>
                      </div>
                      <StatusBadge label={communication.status} tone={statusTone(communication.status)} />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{communication.deliverySummary}</p>
                    {communication.relatedEntityType ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Related: {communication.relatedEntityType} {communication.relatedEntityId}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState description="Communication requests will appear here after domains start using the pipeline." title="No communication history" />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Failed Delivery Queue</CardTitle>
                  <CardDescription>Review provider failures, inspect safe payloads, and retry without losing history.</CardDescription>
                </div>
                {failedDeliveries.length > 0 ? (
                  <form action={retryAllFailedCommunicationDeliveriesAction}>
                    <Button size="sm" type="submit" variant="outline">Retry All Failed</Button>
                  </form>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {failedDeliveries.length > 0 ? (
                failedDeliveries.slice(0, 10).map((delivery) => (
                  <div key={delivery.id} className="rounded-xl border border-danger/30 bg-danger/6 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{delivery.communicationTitle}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {delivery.providerId} / {delivery.channelType} / {delivery.destinationKey}
                        </p>
                      </div>
                      <StatusBadge label={delivery.status} tone="danger" />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{delivery.errorMessage ?? "No provider error message recorded."}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <form action={retryCommunicationDeliveryAction}>
                        <input name="deliveryId" type="hidden" value={delivery.id} />
                        <Button size="sm" type="submit" variant="outline">Retry</Button>
                      </form>
                      {delivery.relatedEntityType && delivery.relatedEntityId ? (
                        <span className="text-xs text-muted-foreground">
                          Related: {delivery.relatedEntityType} {delivery.relatedEntityId}
                        </span>
                      ) : null}
                    </div>
                    <details className="mt-3 rounded-lg border border-border/60 bg-background/50 p-3">
                      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        View Safe Payload
                      </summary>
                      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">
                        {formatPayload(delivery.sanitizedPayload)}
                      </pre>
                    </details>
                  </div>
                ))
              ) : (
                <EmptyState description="Provider failures and missing mappings will appear here for staff review." title="No failed deliveries" />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Delivery Timeline</CardTitle>
              <CardDescription>Recent delivery records across portal and Discord providers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentDeliveries.length > 0 ? (
                recentDeliveries.map((delivery) => (
                  <div key={delivery.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{delivery.communicationTitle}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {delivery.channelType} / {delivery.destinationKey} / attempts {delivery.attemptCount}
                        </p>
                      </div>
                      <StatusBadge label={delivery.status} tone={statusTone(delivery.status)} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Updated {formatDateTime(delivery.updatedAt)}
                      {delivery.providerMessageId ? ` / Provider message ${delivery.providerMessageId}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState description="Delivery records appear once communications are dispatched." title="No delivery history" />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
              <CardDescription>Create draft announcements and send them through the unified pipeline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={createAnnouncementAction} className="grid gap-4 rounded-xl border border-border/70 bg-background/45 p-4">
                <label className="space-y-2">
                  <span className={labelClassName}>Announcement Type</span>
                  <select className={inputClassName} name="type" defaultValue="community">
                    <option value="deployment">Deployment Announcement</option>
                    <option value="weekend_operation">Weekend Operation Announcement</option>
                    <option value="patrol">Patrol Announcement</option>
                    <option value="community">Community Announcement</option>
                    <option value="administrative">Administrative Announcement</option>
                    <option value="system">System Announcement</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className={labelClassName}>Title</span>
                  <input className={inputClassName} name="title" placeholder="Announcement title" />
                </label>
                <label className="space-y-2">
                  <span className={labelClassName}>Body</span>
                  <textarea className={textareaClassName} name="body" placeholder="Announcement content" />
                </label>
                <Button type="submit">Create Draft</Button>
              </form>
              {data.announcements.length > 0 ? (
                data.announcements.map((announcement) => (
                  <div key={announcement.id} className="rounded-xl border border-border/70 bg-background/45 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{announcement.title}</p>
                        <p className="text-sm text-muted-foreground">{announcement.type} / {formatDateTime(announcement.createdAt)}</p>
                      </div>
                      <StatusBadge label={announcement.status} tone={statusTone(announcement.status)} />
                    </div>
                    {announcement.status !== "sent" ? (
                      <form action={sendAnnouncementAction} className="mt-3">
                        <input name="announcementId" type="hidden" value={announcement.id} />
                        <Button size="sm" type="submit" variant="outline">Send Now</Button>
                      </form>
                    ) : null}
                  </div>
                ))
              ) : null}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Scheduled Communications</CardTitle>
              <CardDescription>Scheduling is explicit; no fake sends are marked successful.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.scheduledCommunications.length > 0 ? (
                data.scheduledCommunications.map((communication) => (
                  <div key={communication.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <p className="font-semibold text-foreground">{communication.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {communication.type} / {communication.scheduledFor ? formatDateTime(communication.scheduledFor) : "No schedule time"}
                    </p>
                    <form action={cancelScheduledCommunicationAction} className="mt-3">
                      <input name="communicationId" type="hidden" value={communication.id} />
                      <Button size="sm" type="submit" variant="outline">Cancel</Button>
                    </form>
                  </div>
                ))
              ) : (
                <EmptyState description="Future scheduled communications will appear here." title="No scheduled communications" />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Active Deliveries</CardTitle>
              <CardDescription>Pending, processing, and retrying provider work.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeDeliveries.length > 0 ? (
                activeDeliveries.slice(0, 8).map((delivery) => (
                  <div key={delivery.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{delivery.channelType}</p>
                      <StatusBadge label={delivery.status} tone={statusTone(delivery.status)} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{delivery.destinationKey}</p>
                  </div>
                ))
              ) : (
                <EmptyState description="No provider work is currently pending." title="No active deliveries" />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>Template records validate variables and keep provider formatting separate.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form action={ensureCommunicationTemplatesAction}>
                <Button size="sm" type="submit" variant="outline">Ensure Default Templates</Button>
              </form>
              {data.templates.length > 0 ? (
                data.templates.slice(0, 8).map((template) => (
                  <div key={template.id} className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <p className="font-semibold text-foreground">{template.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{template.key} / v{template.version}</p>
                  </div>
                ))
              ) : (
                <EmptyState description="Create default templates to initialize the communication template catalog." title="No templates yet" />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>User preference records are honored by the pipeline where applicable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.preferences.length > 0 ? (
                data.preferences.map((preference) => (
                  <div key={preference.category} className="rounded-xl border border-border/70 bg-background/45 p-3">
                    <p className="font-semibold text-foreground">{preference.category}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Portal {preference.portalEnabled ? "on" : "off"} / Discord {preference.discordChannelEnabled ? "on" : "off"} / {preference.criticalOnly ? "Critical only" : "All priorities"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState description="Preference rows appear after users customize communication delivery." title="No preferences set" />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Diagnostics</CardTitle>
              <CardDescription>Pipeline safety checks and future provider readiness.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Provider failures are isolated and recorded as delivery failures.</p>
              <p>Idempotency keys prevent duplicate sends for repeated source events.</p>
              <p>Email, SMS, and Discord DM providers are intentionally placeholders.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
