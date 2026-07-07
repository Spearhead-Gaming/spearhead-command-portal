"use client";

import { useRouter } from "next/navigation";

import { InspectorDrawer } from "@/components/inspector/inspector-drawer";
import type { BadgeTone } from "@/components/status/status-badge";
import type { PlaceholderSection } from "@/types/placeholder-page";

type AdministrationInspectorDrawerProps = {
  children: React.ReactNode;
  closeHref: string;
  open: boolean;
  sections: PlaceholderSection[];
  statusBadge?: {
    label: string;
    tone?: BadgeTone;
  };
  subtitle: string;
  tabs: string[];
  title: string;
};

export function AdministrationInspectorDrawer({
  children,
  closeHref,
  open,
  sections,
  statusBadge,
  subtitle,
  tabs,
  title,
}: AdministrationInspectorDrawerProps) {
  const router = useRouter();

  if (!open) {
    return null;
  }

  return (
    <InspectorDrawer
      onClose={() => router.replace(closeHref)}
      open={open}
      sections={sections}
      statusBadge={statusBadge}
      subtitle={subtitle}
      tabs={tabs}
      title={title}
    >
      {children}
    </InspectorDrawer>
  );
}
