"use client";

import { useRouter } from "next/navigation";

import { InspectorDrawer } from "@/components/inspector/inspector-drawer";
import type { BadgeTone } from "@/components/status/status-badge";
import type { PlaceholderAction, PlaceholderSection } from "@/types/placeholder-page";

type DocumentInspectorDrawerProps = {
  closeHref: string;
  open: boolean;
  title: string;
  subtitle: string;
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

export function DocumentInspectorDrawer({
  closeHref,
  open,
  title,
  subtitle,
  sections,
  tabPanels,
  actions,
  statusBadge,
  children,
}: DocumentInspectorDrawerProps) {
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
      title={title}
    >
      {children}
    </InspectorDrawer>
  );
}
