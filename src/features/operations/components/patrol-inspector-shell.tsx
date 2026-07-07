"use client";

import { useCallback } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { InspectorDrawer } from "@/components/inspector/inspector-drawer";
import type { BadgeTone } from "@/components/status/status-badge";

export function PatrolInspectorShell({
  children,
  closeHref,
  status,
  subtitle,
  tabPanels,
  title,
}: {
  children: ReactNode;
  closeHref: string;
  status: {
    label: string;
    tone?: BadgeTone;
  };
  subtitle: string;
  tabPanels?: Array<{
    content: ReactNode;
    label: string;
  }>;
  title: string;
}) {
  const router = useRouter();
  const close = useCallback(() => {
    router.push(closeHref);
  }, [closeHref, router]);

  return (
    <InspectorDrawer
      open
      onClose={close}
      statusBadge={status}
      subtitle={subtitle}
      tabPanels={tabPanels}
      title={title}
    >
      {children}
    </InspectorDrawer>
  );
}
