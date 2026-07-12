"use client";

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import Link from "next/link";

import { useFocusTrap } from "@/components/layout/focus-management";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PlaceholderAction, PlaceholderSection } from "@/types/placeholder-page";

type InspectorDrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  statusBadge?: {
    label: string;
    tone?: "info" | "success" | "warning" | "danger" | "muted";
  };
  size?: "standard" | "wide" | "extra-wide";
  tabs?: string[];
  sections?: PlaceholderSection[];
  tabPanels?: Array<{
    label: string;
    content: React.ReactNode;
  }>;
  actions?: PlaceholderAction[];
  children?: React.ReactNode;
};

function InspectorActionButton({ action }: { action: PlaceholderAction }) {
  if (action.href) {
    return (
      <Button asChild variant={action.variant ?? "outline"}>
        <Link href={action.href}>{action.label}</Link>
      </Button>
    );
  }

  return (
    <Button
      aria-disabled="true"
      disabled
      title={`${action.label} is not implemented yet.`}
      variant={action.variant ?? "outline"}
    >
      {action.label}
    </Button>
  );
}

export function InspectorDrawer({
  open,
  onClose,
  title,
  subtitle,
  statusBadge,
  size = "wide",
  tabs,
  sections = [],
  tabPanels,
  actions,
  children,
}: InspectorDrawerProps) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const availableTabs = useMemo(
    () =>
      tabPanels?.map((panel) => panel.label) ??
      tabs ??
      ["Summary", "Readiness", "History"],
    [tabPanels, tabs],
  );
  const [activeTab, setActiveTab] = useState(availableTabs[0] ?? "Summary");

  const resolvedActiveTab = availableTabs.includes(activeTab)
    ? activeTab
    : (availableTabs[0] ?? "Summary");

  const activeSection = useMemo(() => {
    const match = sections.find((section) =>
      section.title.toLowerCase().includes(resolvedActiveTab.toLowerCase()),
    );

    return match ?? sections[0] ?? null;
  }, [resolvedActiveTab, sections]);
  const activePanel = useMemo(
    () => tabPanels?.find((panel) => panel.label === resolvedActiveTab) ?? null,
    [resolvedActiveTab, tabPanels],
  );

  useFocusTrap(drawerRef, {
    active: open,
    onEscape: onClose,
  });

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex overscroll-contain bg-black/60">
      <button
        aria-label="Close inspector drawer"
        className="hidden flex-1 lg:block"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-describedby="inspector-drawer-description"
        aria-labelledby="inspector-drawer-title"
        aria-modal="true"
        className={cn(
          "ml-auto flex h-full w-full max-w-full flex-col border-l border-border/80 bg-background/96 outline-none shadow-[0_24px_80px_rgba(2,6,14,0.55)]",
          size === "standard" && "sm:max-w-[min(40rem,calc(100vw-2rem))]",
          size === "wide" && "sm:max-w-[min(48rem,calc(100vw-2rem))]",
          size === "extra-wide" && "sm:max-w-[min(64rem,calc(100vw-2rem))]",
        )}
        data-inspector-drawer
        ref={drawerRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 sm:hidden">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Inspector
          </p>
          <Button onClick={onClose} size="icon" variant="ghost">
            <X className="h-4 w-4" />
            <span className="sr-only">Close inspector</span>
          </Button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-5"
          data-inspector-scroll-region
        >
          <Card className="flex min-h-full flex-col border-border/80 bg-card/96">
            <CardHeader className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <CardTitle className="text-xl sm:text-2xl" id="inspector-drawer-title">
                      {title}
                    </CardTitle>
                    {statusBadge ? (
                      <StatusBadge
                        label={statusBadge.label}
                        tone={statusBadge.tone}
                      />
                    ) : null}
                  </div>
                  <CardDescription className="max-w-2xl" id="inspector-drawer-description">
                    {subtitle}
                  </CardDescription>
                </div>
                <Button className="hidden sm:inline-flex" onClick={onClose} size="icon" variant="ghost">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close inspector</span>
                </Button>
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {availableTabs.map((tab) => (
                  <button
                    key={tab}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      tab === resolvedActiveTab
                        ? "border-primary/30 bg-primary/12 text-foreground"
                        : "border-border/70 bg-background/45 text-muted-foreground hover:bg-card"
                    }`}
                    onClick={() => setActiveTab(tab)}
                    type="button"
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-5 sm:space-y-6">
              {actions?.length ? (
                <div className="flex flex-wrap gap-3">
                  {actions.map((action) => (
                    <InspectorActionButton action={action} key={action.label} />
                  ))}
                </div>
              ) : null}
              {children}
              {activePanel ? (
                <div className="space-y-4">{activePanel.content}</div>
              ) : activeSection ? (
                <>
                  <section className="rounded-2xl border border-border/70 bg-background/40 p-5">
                    <h3 className="text-base font-semibold text-foreground">{activeSection.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {activeSection.description}
                    </p>
                    <ul className="mt-4 space-y-3">
                      {activeSection.items.map((item) => (
                        <li key={item} className="text-sm leading-6 text-muted-foreground">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                  {sections
                    .filter((section) => section !== activeSection)
                    .map((section) => (
                      <section
                        key={section.title}
                        className="rounded-2xl border border-border/70 bg-card/78 p-5"
                      >
                        <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {section.description}
                        </p>
                      </section>
                    ))}
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}
