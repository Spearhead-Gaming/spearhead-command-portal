"use client";

import { useRouter } from "next/navigation";

import { InspectorDrawer } from "@/components/inspector/inspector-drawer";
import type { BadgeTone } from "@/components/status/status-badge";

type DeploymentInspectorDrawerProps = {
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

export function DeploymentInspectorDrawer({
  closeHref,
  open,
  statusBadge,
  subtitle,
  tabPanels,
  title,
}: DeploymentInspectorDrawerProps) {
  const router = useRouter();

  return (
    <InspectorDrawer
      onClose={() => router.replace(closeHref)}
      open={open}
      statusBadge={statusBadge}
      subtitle={subtitle}
      tabPanels={tabPanels}
      title={title}
    />
  );
}
