"use client";

import { useRouter } from "next/navigation";

import { InspectorDrawer } from "@/components/inspector/inspector-drawer";
import type { BadgeTone } from "@/components/status/status-badge";

type ApplicationInspectorDrawerProps = {
  children: React.ReactNode;
  closeHref: string;
  open: boolean;
  statusBadge?: {
    label: string;
    tone?: BadgeTone;
  };
  subtitle: string;
  tabPanels: Array<{
    label: string;
    content: React.ReactNode;
  }>;
  title: string;
};

export function ApplicationInspectorDrawer({
  children,
  closeHref,
  open,
  statusBadge,
  subtitle,
  tabPanels,
  title,
}: ApplicationInspectorDrawerProps) {
  const router = useRouter();

  if (!open) {
    return null;
  }

  return (
    <InspectorDrawer
      onClose={() => router.replace(closeHref)}
      open={open}
      sections={[]}
      statusBadge={statusBadge}
      subtitle={subtitle}
      tabPanels={tabPanels}
      title={title}
    >
      {children}
    </InspectorDrawer>
  );
}
