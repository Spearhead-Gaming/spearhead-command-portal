"use client";

import { useRouter } from "next/navigation";

import { InspectorDrawer } from "@/components/inspector/inspector-drawer";
import type { PlaceholderAction, PlaceholderSection } from "@/types/placeholder-page";
import type { BadgeTone } from "@/components/status/status-badge";

type QueryInspectorDrawerProps = {
  closeHref: string;
  open: boolean;
  title: string;
  subtitle: string;
  tabs?: string[];
  sections?: PlaceholderSection[];
  tabPanels?: Array<{
    label: string;
    content: React.ReactNode;
  }>;
  actions?: PlaceholderAction[];
  statusBadge?: {
    label: string;
    tone?: BadgeTone;
  };
  children?: React.ReactNode;
};

export function QueryInspectorDrawer({
  closeHref,
  open,
  title,
  subtitle,
  tabs,
  sections,
  tabPanels,
  actions,
  statusBadge,
  children,
}: QueryInspectorDrawerProps) {
  const router = useRouter();

  return (
    <InspectorDrawer
      actions={actions}
      onClose={() => router.replace(closeHref)}
      open={open}
      sections={sections}
      statusBadge={statusBadge}
      subtitle={subtitle}
      tabPanels={tabPanels}
      tabs={tabs}
      title={title}
    >
      {children}
    </InspectorDrawer>
  );
}
