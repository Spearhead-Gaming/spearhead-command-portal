"use client";

import { useState } from "react";

import { ActivityFeedPlaceholder } from "@/components/activity/activity-feed-placeholder";
import { ActivityTimelinePlaceholder } from "@/components/activity/activity-timeline-placeholder";
import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { LoadingSkeleton } from "@/components/data/loading-skeleton";
import { InspectorDrawer } from "@/components/inspector/inspector-drawer";
import { QuickActionBar } from "@/components/inspector/quick-action-bar";
import { CollapsibleSection } from "@/components/layout/progressive-disclosure";
import { DataTablePlaceholder } from "@/components/shared/data-table-placeholder";
import { EmptyState } from "@/components/shared/empty-state";
import { PageContextPanel } from "@/components/shared/page-context-panel";
import { PlaceholderSection } from "@/components/shared/placeholder-section";
import { PageHeader } from "@/components/layout/page-header";
import type { PlaceholderPageConfig } from "@/types/placeholder-page";

type PlaceholderRoutePageProps = {
  config: PlaceholderPageConfig;
  contextLabel?: string;
};

export function PlaceholderRoutePage({
  config,
  contextLabel,
}: PlaceholderRoutePageProps) {
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const primarySummary = config.summary?.slice(0, 4) ?? [];
  const secondarySummary = config.summary?.slice(4) ?? [];

  const renderMetricCard = (index: number, metric: NonNullable<PlaceholderPageConfig["summary"]>[number]) => {
    const variant =
      metric.variant ??
      (metric.value.includes("%") ? "readiness" : index % 3 === 0 ? "widget" : "kpi");

    if (variant === "readiness") {
      return (
        <ReadinessCard
          hint={metric.hint}
          key={metric.label}
          label={metric.label}
          statusLabel={metric.tone === "danger" ? "Needs attention" : "Operational placeholder"}
          value={metric.value}
        />
      );
    }

    if (variant === "kpi") {
      return (
        <KpiCard
          hint={metric.hint}
          key={metric.label}
          label={metric.label}
          tone={metric.tone}
          value={metric.value}
        />
      );
    }

    return (
      <DashboardWidget
        description={metric.hint}
        key={metric.label}
        title={metric.label}
        tone={metric.tone}
        value={metric.value}
      />
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={config.breadcrumbs}
        contextLabel={contextLabel}
        description={config.description}
        primaryAction={config.primaryAction}
        secondaryActions={config.secondaryActions}
        title={config.title}
      />
      <QuickActionBar
        extraActions={config.quickActionMenuItems}
        inspectLabel={config.inspector?.triggerLabel}
        onInspect={config.inspector ? () => setInspectorOpen(true) : undefined}
        primaryAction={config.primaryAction}
        secondaryActions={config.secondaryActions}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {primarySummary.length ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {primarySummary.map((metric, index) => renderMetricCard(index, metric))}
            </section>
          ) : null}
          {secondarySummary.length ? (
            <CollapsibleSection
              badgeLabel={`${secondarySummary.length} hidden`}
              description="Secondary metrics stay available without competing with the page's primary answer."
              title="Secondary metrics"
            >
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {secondarySummary.map((metric, index) => renderMetricCard(index + 4, metric))}
              </section>
            </CollapsibleSection>
          ) : null}
          {config.table ? <DataTablePlaceholder table={config.table} /> : null}
          {config.sections?.length ? (
            <CollapsibleSection
              badgeLabel={`${config.sections.length} sections`}
              description="Implementation notes and supporting details are grouped here so the route stays summary-first."
              title="Details and implementation context"
            >
              <section className="grid gap-4 lg:grid-cols-2">
                {config.sections.map((section) => (
                  <PlaceholderSection key={section.title} section={section} />
                ))}
              </section>
            </CollapsibleSection>
          ) : null}
          {config.emptyState ? (
            <EmptyState
              actionLabel={config.emptyState.actionLabel}
              description={config.emptyState.description}
              title={config.emptyState.title}
            />
          ) : null}
        </div>
        <div className="space-y-4">
          <PageContextPanel permissions={config.requiredPermissions} route={config.route} />
          <CollapsibleSection
            description="Activity and timeline context is available on demand instead of staying permanently expanded."
            title="Supporting context"
          >
            <div className="space-y-4">
              <ActivityFeedPlaceholder
                description={config.activityFeed?.description}
                title={config.activityFeed?.title}
              />
              <ActivityTimelinePlaceholder
                description={config.timeline?.description}
                items={config.timeline?.items}
                title={config.timeline?.title}
              />
              {config.showLoadingSkeleton ? <LoadingSkeleton rows={4} /> : null}
            </div>
          </CollapsibleSection>
        </div>
      </div>
      {config.inspector ? (
        <InspectorDrawer
          actions={config.inspector.actions}
          onClose={() => setInspectorOpen(false)}
          open={inspectorOpen}
          sections={config.inspector.sections}
          statusBadge={config.inspector.statusBadge}
          subtitle={config.inspector.subtitle}
          tabs={config.inspector.tabs}
          title={config.inspector.title}
        />
      ) : null}
    </div>
  );
}
