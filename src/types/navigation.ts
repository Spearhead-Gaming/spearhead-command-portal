import type { LucideIcon } from "lucide-react";
import type { WorkspaceId } from "@/server/personas/types";

export type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  requiredPermissions: readonly string[];
  preferredWorkspaces?: readonly WorkspaceId[];
};

export type NavigationGroup = {
  title: string;
  items: NavigationItem[];
  preferredWorkspaces?: readonly WorkspaceId[];
};
