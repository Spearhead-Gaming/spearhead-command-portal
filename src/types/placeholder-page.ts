export type PlaceholderAction = {
  label: string;
  href?: string;
  variant?: "default" | "secondary" | "outline";
};

export type PlaceholderMetric = {
  label: string;
  value: string;
  hint: string;
  tone?: "info" | "success" | "warning" | "danger" | "muted";
  variant?: "widget" | "kpi" | "readiness";
};

export type PlaceholderSection = {
  title: string;
  description: string;
  items: string[];
};

export type PlaceholderTable = {
  title: string;
  description: string;
  columns: string[];
  rows: string[][];
  filters?: string[];
  searchPlaceholder?: string;
  actionMenuItems?: string[];
};

export type PlaceholderTimelineItem = {
  label: string;
  meta: string;
  detail: string;
};

export type PlaceholderInspector = {
  title: string;
  subtitle: string;
  triggerLabel?: string;
  statusBadge?: {
    label: string;
    tone?: "info" | "success" | "warning" | "danger" | "muted";
  };
  tabs?: string[];
  sections: PlaceholderSection[];
  actions?: PlaceholderAction[];
};

export type PlaceholderPageConfig = {
  route: string;
  title: string;
  description: string;
  breadcrumbs?: string[];
  primaryAction?: PlaceholderAction;
  secondaryActions?: PlaceholderAction[];
  requiredPermissions: readonly string[];
  summary?: PlaceholderMetric[];
  sections?: PlaceholderSection[];
  table?: PlaceholderTable;
  quickActionMenuItems?: string[];
  inspector?: PlaceholderInspector;
  activityFeed?: {
    title?: string;
    description?: string;
  };
  timeline?: {
    title?: string;
    description?: string;
    items?: PlaceholderTimelineItem[];
  };
  showLoadingSkeleton?: boolean;
  emptyState?: {
    title: string;
    description: string;
    actionLabel?: string;
  };
};
