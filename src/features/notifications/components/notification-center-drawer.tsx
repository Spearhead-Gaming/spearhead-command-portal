"use client";

import Link from "next/link";
import { Bell, ChevronRight, X } from "lucide-react";

import {
  clearAllNotificationsAction,
  clearNotificationAction,
  clearReadNotificationsAction,
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from "@/server/notifications/actions";
import type { NotificationCenterData } from "@/server/notifications/types";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationCenterDrawerProps = {
  data: NotificationCenterData;
  open: boolean;
  onClose: () => void;
};

function getUrgencyTone(
  urgency: NotificationCenterData["items"][number]["urgency"],
) {
  switch (urgency) {
    case "critical":
      return "danger";
    case "warning":
      return "warning";
    case "action_required":
      return "info";
    default:
      return "muted";
  }
}

function getUrgencyLabel(
  urgency: NotificationCenterData["items"][number]["urgency"],
) {
  switch (urgency) {
    case "action_required":
      return "Action Required";
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    default:
      return "Info";
  }
}

export function NotificationCenterDrawer({
  data,
  open,
  onClose,
}: NotificationCenterDrawerProps) {
  const readCount = data.items.filter((item) => item.isRead).length;

  return (
    <>
      <button
        aria-hidden={!open}
        aria-label="Close notifications drawer"
        className={cn(
          "fixed inset-0 z-40 bg-black/55 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        type="button"
      />
      <aside
        aria-hidden={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-[min(30rem,100vw)] border-l border-border/80 bg-[#08111d] shadow-[0_20px_60px_rgba(1,6,12,0.55)] transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <header className="shrink-0 border-b border-border/80 px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StatusBadge label="Notification Center" tone="info" />
                  <StatusBadge
                    label={`${data.unreadCount} unread`}
                    tone={data.unreadCount > 0 ? "warning" : "muted"}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Portal notifications</h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Personal portal alerts are live. Discord and email delivery remain tracked as
                    placeholders until later milestones.
                  </p>
                </div>
              </div>
              <Button onClick={onClose} size="icon" type="button" variant="outline">
                <X className="h-4 w-4" />
                <span className="sr-only">Close notifications</span>
              </Button>
            </div>
          </header>
          {data.enabled && data.items.length > 0 ? (
            <div className="shrink-0 border-b border-border/80 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap gap-2">
                <form action={markAllNotificationsAsReadAction}>
                  <Button
                    disabled={data.unreadCount === 0}
                    size="sm"
                    type="submit"
                    variant="outline"
                  >
                    Mark All Read
                  </Button>
                </form>
                <form action={clearReadNotificationsAction}>
                  <Button disabled={readCount === 0} size="sm" type="submit" variant="outline">
                    Clear Read
                  </Button>
                </form>
                <form
                  action={clearAllNotificationsAction}
                  onSubmit={(event) => {
                    if (
                      !window.confirm(
                        "Clear all notifications from your notification center? Delivery history and audit records will be preserved.",
                      )
                    ) {
                      event.preventDefault();
                    }
                  }}
                >
                  <Button size="sm" type="submit" variant="outline">
                    Clear All
                  </Button>
                </form>
              </div>
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {!data.enabled ? (
              <EmptyState
                description="This account does not currently have notification-center visibility. Delivery tracking is still enforced server-side."
                title="Notification access is unavailable"
              />
            ) : data.items.length === 0 ? (
              <EmptyState
                description="Portal notifications will appear here once workflow hooks begin emitting real alerts."
                title="No notifications yet"
              />
            ) : (
              <div className="space-y-3">
                {data.items.map((item) => (
                  <article
                    key={item.deliveryId}
                    className={cn(
                      "rounded-2xl border p-4 shadow-[0_10px_30px_rgba(2,8,15,0.22)]",
                      item.isRead
                        ? "border-border/70 bg-card/70"
                        : "border-primary/20 bg-primary/8",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            label={getUrgencyLabel(item.urgency)}
                            tone={getUrgencyTone(item.urgency)}
                          />
                          <StatusBadge
                            label={item.isRead ? "Read" : "Unread"}
                            tone={item.isRead ? "muted" : "warning"}
                          />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {item.message}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {item.createdAtLabel}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border/70 bg-background/60 px-2 py-1">
                        {item.type}
                      </span>
                      {item.createdByLabel ? (
                        <span className="rounded-full border border-border/70 bg-background/60 px-2 py-1">
                          From {item.createdByLabel}
                        </span>
                      ) : null}
                      {item.targetUnitName ? (
                        <span className="rounded-full border border-border/70 bg-background/60 px-2 py-1">
                          Unit {item.targetUnitName}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {!item.isRead ? (
                        <form action={markNotificationAsReadAction}>
                          <input name="deliveryId" type="hidden" value={item.deliveryId} />
                          <Button size="sm" type="submit" variant="outline">
                            Mark Read
                          </Button>
                        </form>
                      ) : null}
                      <form action={clearNotificationAction}>
                        <input name="deliveryId" type="hidden" value={item.deliveryId} />
                        <Button size="sm" type="submit" variant="outline">
                          Clear
                        </Button>
                      </form>
                      {item.actionUrl ? (
                        <Button asChild size="sm">
                          <Link href={item.actionUrl} onClick={onClose}>
                            Open Context
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
          <footer className="shrink-0 border-t border-border/80 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Bell className="h-4 w-4 text-accent" />
              Notification failures are tracked separately so core workflows can continue safely.
            </div>
          </footer>
        </div>
      </aside>
    </>
  );
}
