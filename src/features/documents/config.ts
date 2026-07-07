import { documentPermissions } from "@/features/documents/permissions";
import type { PlaceholderPageConfig } from "@/types/placeholder-page";

export const documentPageConfigs = {
  documentsIndex: {
    route: "/documents",
    title: "Documents",
    description: "Centralize SOPs, guides, CONOPs, AARs, intel, and policies through a modular document hub placeholder.",
    breadcrumbs: ["Documents"],
    primaryAction: { label: "Create Document" },
    secondaryActions: [{ label: "Publish Placeholder", variant: "outline" }],
    requiredPermissions: documentPermissions.documentsIndex,
    quickActionMenuItems: ["Inspect document placeholder", "Open CONOP section", "Queue publish review"],
    summary: [
      { label: "SOPs", value: "08", hint: "Core documentation placeholder", tone: "info", variant: "widget" },
      { label: "Training Guides", value: "11", hint: "Instructional content slot", tone: "success", variant: "kpi" },
      { label: "CONOP Drafts", value: "03", hint: "Operations tie-in placeholder", tone: "warning", variant: "kpi" },
      { label: "Policies", value: "06", hint: "Admin documentation slot", tone: "muted", variant: "kpi" },
    ],
    sections: [
      {
        title: "Document categories reserved",
        description: "The index route is ready for grouped document navigation and later publication workflows.",
        items: [
          "SOPs, training guides, CONOPs, AARs, intel, and policies can each become section panels.",
          "Shared empty states and badges already support draft, published, and restricted states.",
          "No editor or storage integration is attached yet by design.",
        ],
      },
    ],
    activityFeed: {
      title: "Document activity",
      description: "Documents should support operational context rather than bury it.",
    },
  },
  documentDetail: {
    route: "/documents/[id]",
    title: "Document Detail",
    description: "Placeholder detail route for document content, metadata, permissions, and publication status.",
    breadcrumbs: ["Documents", "Detail"],
    primaryAction: { label: "Edit Document" },
    secondaryActions: [
      { label: "Publish", variant: "secondary" },
      { label: "Restrict Access", variant: "outline" },
    ],
    requiredPermissions: documentPermissions.documentDetail,
    sections: [
      {
        title: "Document presentation shell",
        description: "This route reserves room for content preview, revision status, and access controls.",
        items: [
          "Route structure supports deep links from campaigns, events, and administration.",
          "Metadata, authorship, and publication controls can attach without changing layout patterns.",
          "Milestone 1 keeps the detail view intentionally static and service-free.",
        ],
      },
    ],
    emptyState: {
      title: "Document body placeholder",
      description: "Rendered content and version history will arrive in the documents milestone.",
      actionLabel: "Reserve Detail Layout",
    },
  },
} satisfies Record<string, PlaceholderPageConfig>;
