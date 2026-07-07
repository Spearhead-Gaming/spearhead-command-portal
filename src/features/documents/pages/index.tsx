import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardWidget } from "@/components/dashboard/dashboard-widget";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ReadinessCard } from "@/components/dashboard/readiness-card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge, type BadgeTone } from "@/components/status/status-badge";
import { UnitBadge } from "@/components/status/unit-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCountLabel, formatDate, formatDateTime } from "@/lib/formatters";
import { getCurrentUser } from "@/server/auth/current-user";
import {
  getDocument,
  getDocumentReferenceData,
  listDocuments,
} from "@/server/documents";
import type {
  DocumentDetail,
  DocumentLibraryFilters,
  DocumentListItem,
} from "@/server/documents/types";
import { can } from "@/server/permissions/access";
import { DocumentInspectorDrawer } from "@/features/documents/components/document-inspector-drawer";
import {
  ArchiveDocumentForm,
  CreateDocumentCategoryForm,
  CreateDocumentForm,
  CreateVersionForm,
  DeleteAttachmentForm,
  DocumentFormShell,
  DuplicateDocumentForm,
  EditDocumentForm,
  ManageDocumentPermissionForm,
  PublishDocumentForm,
  ReadAcknowledgementForm,
  RestoreDocumentForm,
  UploadAttachmentForm,
} from "@/features/documents/components/document-forms";

type SearchParamsValue = string | string[] | undefined;
type SearchParamsRecord = Record<string, SearchParamsValue>;

function getSearchParamValue(searchParams: SearchParamsRecord, key: string) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function buildHref(
  pathname: string,
  searchParams: SearchParamsRecord,
  updates: Record<string, string | undefined | null>,
) {
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    const normalized = Array.isArray(value) ? value[0] : value;

    if (normalized) {
      nextParams.set(key, normalized);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }
  }

  const query = nextParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function getDocumentStatusTone(status: string): BadgeTone {
  switch (status) {
    case "published":
      return "success";
    case "archived":
      return "warning";
    default:
      return "info";
  }
}

function getDocumentVisibilityTone(visibility: string): BadgeTone {
  switch (visibility) {
    case "public":
      return "success";
    case "members":
      return "info";
    case "unit":
      return "warning";
    case "restricted":
    case "admin":
      return "danger";
    default:
      return "muted";
  }
}

function FlashNotice({
  message,
  tone,
}: {
  message: string;
  tone: BadgeTone;
}) {
  return (
    <Card
      className={
        tone === "danger"
          ? "border-danger/30 bg-danger/10"
          : "border-success/30 bg-success/10"
      }
    >
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {tone === "danger" ? "Action blocked" : "Action completed"}
          </p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <StatusBadge label={tone === "danger" ? "Error" : "Saved"} tone={tone} />
      </CardContent>
    </Card>
  );
}

function DocumentFiltersCard({
  searchParams,
  categories,
}: {
  searchParams: SearchParamsRecord;
  categories: Awaited<ReturnType<typeof getDocumentReferenceData>>["categories"];
}) {
  const fieldClassName =
    "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <Card className="border-border/80 bg-card/82">
      <CardHeader>
        <CardTitle>Library filters</CardTitle>
        <CardDescription>
          Search the knowledge base by title, category, status, visibility, and review attention.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/documents" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" method="get">
          <input
            className={fieldClassName}
            defaultValue={getSearchParamValue(searchParams, "q") ?? ""}
            name="q"
            placeholder="Search title, slug, excerpt, or owner"
          />
          <select
            className={fieldClassName}
            defaultValue={getSearchParamValue(searchParams, "categoryId") ?? ""}
            name="categoryId"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <select
            className={fieldClassName}
            defaultValue={getSearchParamValue(searchParams, "status") ?? ""}
            name="status"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <select
            className={fieldClassName}
            defaultValue={getSearchParamValue(searchParams, "visibility") ?? ""}
            name="visibility"
          >
            <option value="">All visibility</option>
            <option value="public">Public</option>
            <option value="members">Members</option>
            <option value="unit">Unit</option>
            <option value="restricted">Restricted</option>
            <option value="admin">Admin</option>
          </select>
          <select
            className={fieldClassName}
            defaultValue={getSearchParamValue(searchParams, "reviewState") ?? ""}
            name="reviewState"
          >
            <option value="">All review states</option>
            <option value="pending">Has review date</option>
            <option value="overdue">Review overdue</option>
          </select>
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-foreground">
            <input
              defaultChecked={getSearchParamValue(searchParams, "mine") === "true"}
              name="mine"
              type="checkbox"
              value="true"
            />
            <span>My documents</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-foreground">
            <input
              defaultChecked={getSearchParamValue(searchParams, "unreadOnly") === "true"}
              name="unreadOnly"
              type="checkbox"
              value="true"
            />
            <span>Unread only</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-foreground">
            <input
              defaultChecked={getSearchParamValue(searchParams, "pinnedOnly") === "true"}
              name="pinnedOnly"
              type="checkbox"
              value="true"
            />
            <span>Pinned only</span>
          </div>
          <Button type="submit" variant="outline">
            Apply filters
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DocumentListCard({
  document,
  inspectHref,
  detailHref,
}: {
  document: DocumentListItem;
  inspectHref: string;
  detailHref: string;
}) {
  return (
    <Card className="border-border/70 bg-background/45">
      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{document.title}</p>
            <StatusBadge label={document.status.toUpperCase()} tone={getDocumentStatusTone(document.status)} />
            <StatusBadge
              label={document.visibility.toUpperCase()}
              tone={getDocumentVisibilityTone(document.visibility)}
            />
            {document.category ? <StatusBadge label={document.category.label} tone="muted" /> : null}
            {document.isPinned ? <StatusBadge label="Pinned" tone="warning" /> : null}
            {document.unread ? <StatusBadge label="Unread" tone="info" /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {document.description ?? document.excerpt}
          </p>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {[
              document.unitShortName ? `Unit ${document.unitShortName}` : null,
              document.ownerDisplayName ? `Owner ${document.ownerDisplayName}` : null,
              `V${document.currentVersionNumber}`,
              `${document.attachmentCount} attachment${document.attachmentCount === 1 ? "" : "s"}`,
            ]
              .filter(Boolean)
              .join(" / ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href={inspectHref}>Inspect</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={detailHref}>Open document</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentDrawerPanels({
  detail,
}: {
  detail: DocumentDetail;
}) {
  return [
    {
      label: "Overview",
      content: (
        <div className="space-y-4">
          <Card className="border-border/70 bg-background/45">
            <CardContent className="grid gap-4 p-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Version</p>
                <p className="mt-1 text-sm text-foreground">V{detail.currentVersionNumber}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Published</p>
                <p className="mt-1 text-sm text-foreground">{formatDateTime(detail.publishedAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Next review</p>
                <p className="mt-1 text-sm text-foreground">{formatDate(detail.nextReviewAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Read acknowledgement</p>
                <p className="mt-1 text-sm text-foreground">
                  {detail.readAcknowledgement.hasReadCurrentVersion
                    ? `Acknowledged ${formatDateTime(detail.readAcknowledgement.readAt)}`
                    : "Current version not yet acknowledged"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-background/45">
            <CardHeader>
              <CardTitle>Excerpt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-muted-foreground">{detail.excerpt}</p>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      label: "Attachments",
      content: detail.attachments.length > 0 ? (
        <div className="space-y-3">
          {detail.attachments.map((attachment) => (
            <Card key={attachment.id} className="border-border/70 bg-background/45">
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{attachment.label}</p>
                  <StatusBadge label={attachment.mimeType} tone="muted" />
                  {attachment.versionNumber ? <StatusBadge label={`V${attachment.versionNumber}`} tone="info" /> : null}
                </div>
                <p className="text-sm text-muted-foreground">{attachment.fileName}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          description="No document attachments are attached yet."
          title="No attachments"
        />
      ),
    },
    {
      label: "History",
      content: detail.versions.length > 0 ? (
        <div className="space-y-3">
          {detail.versions.map((version) => (
            <Card key={version.id} className="border-border/70 bg-background/45">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">Version {version.versionNumber}</p>
                  <StatusBadge label={version.bodyFormat.toUpperCase()} tone="info" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {version.changeSummary ?? "No change summary provided."}
                </p>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {formatDateTime(version.createdAt)}
                  {version.createdByDisplayName ? ` / ${version.createdByDisplayName}` : ""}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Version history will appear once revisions are created."
          title="No versions"
        />
      ),
    },
    {
      label: "Access",
      content: (
        <div className="space-y-3">
          <Card className="border-border/70 bg-background/45">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={detail.visibility.toUpperCase()} tone={getDocumentVisibilityTone(detail.visibility)} />
                {detail.unitShortName ? <UnitBadge label={detail.unitShortName} /> : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {detail.permissions.length > 0
                  ? "Additional document-specific access rules are attached."
                  : "No explicit document permission rows are attached."}
              </p>
            </CardContent>
          </Card>
          {detail.permissions.length > 0 ? (
            detail.permissions.map((permission) => (
              <Card key={permission.id} className="border-border/70 bg-background/45">
                <CardContent className="space-y-2 p-4">
                  <p className="font-semibold text-foreground">{permission.permissionKey}</p>
                  <p className="text-sm text-muted-foreground">
                    {permission.unitShortName ? `Unit scope ${permission.unitShortName}` : "Global rule"}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : null}
        </div>
      ),
    },
    {
      label: "Activity",
      content: detail.revisionHistory.length > 0 ? (
        <div className="space-y-3">
          {detail.revisionHistory.map((entry) => (
            <Card key={entry.id} className="border-border/70 bg-background/45">
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{entry.summary}</p>
                  <StatusBadge label={entry.action} tone={entry.badgeTone} />
                </div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                  {entry.actorDisplayName ? ` / ${entry.actorDisplayName}` : ""}
                </p>
                {entry.reason ? <p className="text-sm text-muted-foreground">{entry.reason}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          description="Document workflow activity will appear here as revisions, publishing, and acknowledgements happen."
          title="No activity"
        />
      ),
    },
  ];
}

function DocumentInspectorContent({
  detail,
  referenceData,
  returnTo,
  panel,
}: {
  detail: DocumentDetail;
  referenceData: Awaited<ReturnType<typeof getDocumentReferenceData>>;
  returnTo: string;
  panel?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href={`/documents/${detail.slug}`}>Open detail page</Link>
        </Button>
        <ReadAcknowledgementForm detail={detail} returnTo={returnTo} />
      </div>
      {panel === "edit" && detail.capability.canEdit ? (
        <DocumentFormShell
          description="Update metadata, review dates, visibility, and tags."
          title="Edit document"
        >
          <EditDocumentForm detail={detail} referenceData={referenceData} returnTo={returnTo} />
        </DocumentFormShell>
      ) : null}
      {panel === "version" && detail.capability.canEdit ? (
        <DocumentFormShell
          description="Create a new stored version without locking the editor implementation to a single format."
          title="Create version"
        >
          <CreateVersionForm detail={detail} returnTo={returnTo} />
        </DocumentFormShell>
      ) : null}
      {panel === "attachment" && detail.capability.canManageAttachments ? (
        <DocumentFormShell
          description="Add attachment metadata for portal-managed files and future storage integrations."
          title="Add attachment"
        >
          <UploadAttachmentForm detail={detail} returnTo={returnTo} />
        </DocumentFormShell>
      ) : null}
      {panel === "permissions" && detail.capability.canManagePermissions ? (
        <DocumentFormShell
          description="Manage document-specific access rules using permission keys and optional unit scope."
          title="Manage access rules"
        >
          <ManageDocumentPermissionForm detail={detail} referenceData={referenceData} returnTo={returnTo} />
        </DocumentFormShell>
      ) : null}
      {panel === "publish" && detail.capability.canPublish ? (
        <DocumentFormShell
          description="Publish the current document version to the wider portal audience."
          title="Publish document"
        >
          <PublishDocumentForm documentId={detail.id} returnTo={returnTo} />
        </DocumentFormShell>
      ) : null}
      {panel === "archive" && detail.capability.canArchive ? (
        <DocumentFormShell
          description="Archive the document while preserving version, attachment, and acknowledgement history."
          title="Archive document"
        >
          <ArchiveDocumentForm documentId={detail.id} returnTo={returnTo} />
        </DocumentFormShell>
      ) : null}
      {panel === "restore" && detail.capability.canArchive ? (
        <DocumentFormShell
          description="Restore an archived document back into the active library."
          title="Restore document"
        >
          <RestoreDocumentForm documentId={detail.id} returnTo={returnTo} />
        </DocumentFormShell>
      ) : null}
      {panel === "duplicate" && detail.capability.canEdit ? (
        <DocumentFormShell
          description="Duplicate the document foundation into a new draft with copied metadata and current content."
          title="Duplicate document"
        >
          <DuplicateDocumentForm documentId={detail.id} returnTo={returnTo} />
        </DocumentFormShell>
      ) : null}
      {panel === undefined ? (
        <Card className="border-border/70 bg-background/55">
          <CardContent className="flex flex-wrap gap-3 p-4">
            {detail.capability.canEdit ? (
              <Button asChild>
                <Link href={`${returnTo}${returnTo.includes("?") ? "&" : "?"}panel=edit`}>Edit metadata</Link>
              </Button>
            ) : null}
            {detail.capability.canEdit ? (
              <Button asChild variant="outline">
                <Link href={`${returnTo}${returnTo.includes("?") ? "&" : "?"}panel=version`}>Create version</Link>
              </Button>
            ) : null}
            {detail.capability.canManageAttachments ? (
              <Button asChild variant="outline">
                <Link href={`${returnTo}${returnTo.includes("?") ? "&" : "?"}panel=attachment`}>Add attachment</Link>
              </Button>
            ) : null}
            {detail.capability.canManagePermissions ? (
              <Button asChild variant="ghost">
                <Link href={`${returnTo}${returnTo.includes("?") ? "&" : "?"}panel=permissions`}>Access rules</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export async function DocumentsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const panel = getSearchParamValue(resolvedSearchParams, "panel");
  const inspect = getSearchParamValue(resolvedSearchParams, "inspect");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const filters: DocumentLibraryFilters = {
    q: getSearchParamValue(resolvedSearchParams, "q"),
    categoryId: getSearchParamValue(resolvedSearchParams, "categoryId"),
    status: (getSearchParamValue(resolvedSearchParams, "status") ?? "") as DocumentLibraryFilters["status"],
    visibility: (getSearchParamValue(resolvedSearchParams, "visibility") ?? "") as DocumentLibraryFilters["visibility"],
    reviewState: (getSearchParamValue(resolvedSearchParams, "reviewState") ?? "") as DocumentLibraryFilters["reviewState"],
    mine: getSearchParamValue(resolvedSearchParams, "mine") === "true",
    unreadOnly: getSearchParamValue(resolvedSearchParams, "unreadOnly") === "true",
    pinnedOnly: getSearchParamValue(resolvedSearchParams, "pinnedOnly") === "true",
  };

  const [referenceData, libraryData, selectedDocument, user] = await Promise.all([
    getDocumentReferenceData(),
    listDocuments(filters),
    inspect ? getDocument(inspect) : Promise.resolve(null),
    getCurrentUser(),
  ]);

  const canCreate = user ? can(user, "documents.create") : false;
  const canManageCategories = user ? can(user, "documents.categories.manage") : false;
  const cleanHref = buildHref("/documents", resolvedSearchParams, {
    inspect: undefined,
    panel: undefined,
    message: undefined,
    error: undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Documents"]}
        description="Portal-first document management for SOPs, training guides, doctrine, operational references, and future CONOP/AAR knowledge workflows."
        title="Document Library"
      />
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Knowledge-base controls</p>
            <p className="text-sm text-muted-foreground">
              Manage document metadata, access, version history, read acknowledgement, and future review routing from one command-center workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canCreate ? (
              <Button asChild>
                <Link href={buildHref("/documents", resolvedSearchParams, { panel: "create" })}>
                  Create document
                </Link>
              </Button>
            ) : null}
            {canManageCategories ? (
              <Button asChild variant="outline">
                <Link href={buildHref("/documents", resolvedSearchParams, { panel: "category" })}>
                  Manage categories
                </Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hint="Accessible documents after current filters"
          label="Documents"
          tone="info"
          trend="Knowledge base live"
          value={String(libraryData.summary.totalDocuments)}
        />
        <DashboardWidget
          description="Current-version acknowledgements still missing for the viewer"
          title="Unread Documents"
          tone="warning"
          value={String(libraryData.summary.unreadDocuments)}
        />
        <ReadinessCard
          hint="Documents with review attention tracked through metadata"
          label="Pending Reviews"
          statusLabel={libraryData.summary.overdueReviews > 0 ? "Review overdue" : "Review tracking"}
          value={String(libraryData.summary.pendingReviews)}
        />
        <KpiCard
          hint="Documents authored or owned by the current user"
          label="My Documents"
          tone="success"
          trend={`${libraryData.summary.pinnedDocuments} pinned`}
          value={String(libraryData.summary.myDocuments)}
        />
      </section>
      {panel === "create" && canCreate ? (
        <DocumentFormShell
          description="Create a new knowledge-base record with initial metadata, tags, visibility, and version one content."
          title="Create document"
        >
          <CreateDocumentForm referenceData={referenceData} returnTo={cleanHref} />
        </DocumentFormShell>
      ) : null}
      {panel === "category" && canManageCategories ? (
        <DocumentFormShell
          description="Document categories are configurable and seed-backed, but remain administrator-managed."
          title="Create category"
        >
          <CreateDocumentCategoryForm returnTo={cleanHref} />
        </DocumentFormShell>
      ) : null}
      <DocumentFiltersCard categories={referenceData.categories} searchParams={resolvedSearchParams} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/80 bg-card/88">
              <CardHeader>
                <CardTitle>Recent documents</CardTitle>
                <CardDescription>
                  Recently published references and knowledge-base additions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {libraryData.recentDocuments.length > 0 ? (
                  libraryData.recentDocuments.map((document) => (
                    <Link key={document.id} className="block rounded-xl border border-border/70 bg-background/45 p-3 transition-colors hover:bg-card/80" href={`/documents/${document.slug}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">{document.title}</p>
                        <StatusBadge label={document.status.toUpperCase()} tone={getDocumentStatusTone(document.status)} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{document.excerpt}</p>
                    </Link>
                  ))
                ) : (
                  <EmptyState
                    description="Published documents will appear here once the library has content."
                    title="No recent documents"
                  />
                )}
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-card/88">
              <CardHeader>
                <CardTitle>Recently updated</CardTitle>
                <CardDescription>
                  Metadata and version activity across the visible document library.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {libraryData.recentlyUpdated.length > 0 ? (
                  libraryData.recentlyUpdated.map((document) => (
                    <Link key={document.id} className="block rounded-xl border border-border/70 bg-background/45 p-3 transition-colors hover:bg-card/80" href={`/documents/${document.slug}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">{document.title}</p>
                        <StatusBadge label={`V${document.currentVersionNumber}`} tone="info" />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Updated {formatDateTime(document.updatedAt)}
                      </p>
                    </Link>
                  ))
                ) : (
                  <EmptyState
                    description="Revision and metadata activity will appear here once documents are updated."
                    title="No update history"
                  />
                )}
              </CardContent>
            </Card>
          </div>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Document library</CardTitle>
              <CardDescription>
                {formatCountLabel(libraryData.documents.length, "document")} in the current filtered view.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {libraryData.documents.length > 0 ? (
                libraryData.documents.map((document) => (
                  <DocumentListCard
                    key={document.id}
                    detailHref={`/documents/${document.slug}`}
                    document={document}
                    inspectHref={buildHref("/documents", resolvedSearchParams, { inspect: document.slug })}
                  />
                ))
              ) : (
                <EmptyState
                  description="No documents matched the current search and filter selection."
                  title="No matching documents"
                />
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Category tree</CardTitle>
              <CardDescription>
                Configurable document groupings with live counts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {libraryData.categoryTree.map((category) => (
                <Link
                  key={category.id}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-background/45 px-3 py-2 transition-colors hover:bg-card/80"
                  href={buildHref("/documents", resolvedSearchParams, { categoryId: category.id })}
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{category.label}</p>
                    <p className="text-xs text-muted-foreground">{category.description ?? "Document category"}</p>
                  </div>
                  <StatusBadge label={String(category.documentCount)} tone="info" />
                </Link>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Unread documents</CardTitle>
              <CardDescription>
                Current-version acknowledgements still pending for this user.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {libraryData.unreadDocuments.length > 0 ? (
                libraryData.unreadDocuments.map((document) => (
                  <Link key={document.id} className="block rounded-xl border border-border/70 bg-background/45 p-3 transition-colors hover:bg-card/80" href={`/documents/${document.slug}`}>
                    <p className="font-semibold text-foreground">{document.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{document.category?.label ?? "Uncategorized"} / V{document.currentVersionNumber}</p>
                  </Link>
                ))
              ) : (
                <EmptyState
                  description="No unread current-version acknowledgements are visible right now."
                  title="All caught up"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Pinned documents</CardTitle>
              <CardDescription>
                Foundation is live for pinned knowledge articles. Favorites remain a future per-user layer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {libraryData.documents.filter((document) => document.isPinned).slice(0, 5).length > 0 ? (
                libraryData.documents
                  .filter((document) => document.isPinned)
                  .slice(0, 5)
                  .map((document) => (
                    <Link key={document.id} className="block rounded-xl border border-border/70 bg-background/45 p-3 transition-colors hover:bg-card/80" href={`/documents/${document.slug}`}>
                      <p className="font-semibold text-foreground">{document.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{document.excerpt}</p>
                    </Link>
                  ))
              ) : (
                <EmptyState
                  description="Pinned knowledge articles will appear here once documents are marked for quick access."
                  title="No pinned documents"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Favorites placeholder</CardTitle>
              <CardDescription>
                Per-user document favorites are intentionally deferred, but the library layout reserves room for them now.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                description="Future favorites will let members pin their own reference sets without changing the core document model."
                title="Favorites later"
              />
            </CardContent>
          </Card>
        </div>
      </div>
      {selectedDocument ? (
        <DocumentInspectorDrawer
          closeHref={buildHref("/documents", resolvedSearchParams, { inspect: undefined, panel: undefined })}
          open
          sections={[]}
          statusBadge={{
            label: selectedDocument.status.toUpperCase(),
            tone: getDocumentStatusTone(selectedDocument.status),
          }}
          subtitle={selectedDocument.description ?? "Document metadata, revision, access, and knowledge-base context."}
          tabPanels={DocumentDrawerPanels({ detail: selectedDocument })}
          title={selectedDocument.title}
        >
          <DocumentInspectorContent
            detail={selectedDocument}
            panel={panel}
            referenceData={referenceData}
            returnTo={buildHref("/documents", resolvedSearchParams, { inspect, message: undefined, error: undefined })}
          />
        </DocumentInspectorDrawer>
      ) : null}
    </div>
  );
}

export async function DocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<SearchParamsRecord>;
}) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const inspect = getSearchParamValue(resolvedSearchParams, "inspect");
  const panel = getSearchParamValue(resolvedSearchParams, "panel");
  const message = getSearchParamValue(resolvedSearchParams, "message");
  const error = getSearchParamValue(resolvedSearchParams, "error");
  const [detail, referenceData] = await Promise.all([
    getDocument(id),
    getDocumentReferenceData(),
  ]);

  if (!detail) {
    notFound();
  }

  const detailHref = `/documents/${detail.slug}`;
  const cleanHref = buildHref(detailHref, resolvedSearchParams, {
    inspect: undefined,
    panel: undefined,
    message: undefined,
    error: undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={["Documents", detail.title]}
        contextLabel={detail.slug}
        description="Managed knowledge-base record with metadata, revisions, attachments, acknowledgements, and future operational integration hooks."
        title={detail.title}
      />
      {message ? <FlashNotice message={message} tone="success" /> : null}
      {error ? <FlashNotice message={error} tone="danger" /> : null}
      <Card className="border-border/80 bg-card/72">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={detail.status.toUpperCase()} tone={getDocumentStatusTone(detail.status)} />
            <StatusBadge label={detail.visibility.toUpperCase()} tone={getDocumentVisibilityTone(detail.visibility)} />
            {detail.category ? <StatusBadge label={detail.category.label} tone="muted" /> : null}
            {detail.unitShortName ? <UnitBadge label={detail.unitShortName} /> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <ReadAcknowledgementForm detail={detail} returnTo={cleanHref} />
            <Button asChild variant="outline">
              <Link href={buildHref(detailHref, resolvedSearchParams, { inspect: "meta" })}>Open inspector</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/documents">Back to library</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          hint="Current document version"
          label="Version"
          tone="info"
          trend={detail.bodyFormat.toUpperCase()}
          value={`V${detail.currentVersionNumber}`}
        />
        <DashboardWidget
          description="Managed attachment records"
          title="Attachments"
          tone="success"
          value={String(detail.attachments.length)}
        />
        <ReadinessCard
          hint="Readers who acknowledged the current version"
          label="Read Receipts"
          statusLabel={detail.readAcknowledgement.hasReadCurrentVersion ? "Acknowledged" : "Pending acknowledgement"}
          value={String(detail.readAcknowledgement.readersForCurrentVersion)}
        />
        <KpiCard
          hint="Tracked stored versions"
          label="Version History"
          tone="warning"
          trend="Revision foundation"
          value={String(detail.versions.length)}
        />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Document body</CardTitle>
              <CardDescription>
                Editor abstraction is future-ready for markdown, rich text, or block editing without locking the data model today.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {detail.body ? (
                <pre className="whitespace-pre-wrap rounded-2xl border border-border/70 bg-background/45 p-4 font-mono text-sm leading-7 text-foreground">
                  {detail.body}
                </pre>
              ) : (
                <EmptyState
                  description="This document does not have stored body content yet."
                  title="No body content"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
              <CardDescription>
                Attachment metadata supports PDF, images, Office documents, and ZIP references with preview reserved for later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.attachments.length > 0 ? (
                detail.attachments.map((attachment) => (
                  <Card key={attachment.id} className="border-border/70 bg-background/45">
                    <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{attachment.label}</p>
                          <StatusBadge label={attachment.mimeType} tone="muted" />
                          {attachment.versionNumber ? <StatusBadge label={`V${attachment.versionNumber}`} tone="info" /> : null}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {attachment.fileName}
                          {attachment.sizeBytes ? ` / ${attachment.sizeBytes} bytes` : ""}
                        </p>
                      </div>
                      {detail.capability.canManageAttachments ? (
                        <DeleteAttachmentForm attachmentId={attachment.id} returnTo={cleanHref} />
                      ) : null}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState
                  description="No managed attachments are linked to this document yet."
                  title="No attachments"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Version history</CardTitle>
              <CardDescription>
                Stored document versions provide the foundation for later review and approval workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.versions.length > 0 ? (
                detail.versions.map((version) => (
                  <Card key={version.id} className="border-border/70 bg-background/45">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">Version {version.versionNumber}</p>
                        <StatusBadge label={version.bodyFormat.toUpperCase()} tone="info" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {version.changeSummary ?? "No change summary recorded."}
                      </p>
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {formatDateTime(version.createdAt)}
                        {version.createdByDisplayName ? ` / ${version.createdByDisplayName}` : ""}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState
                  description="Version records will appear here when revisions are created."
                  title="No version history"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/88">
            <CardHeader>
              <CardTitle>Related documents</CardTitle>
              <CardDescription>
                Placeholder for future semantic and operational document relationships.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.relatedDocumentsPlaceholder.length > 0 ? (
                detail.relatedDocumentsPlaceholder.map((related) => (
                  <Link key={related.id} className="block rounded-xl border border-border/70 bg-background/45 p-3 transition-colors hover:bg-card/80" href={`/documents/${related.slug}`}>
                    <p className="font-semibold text-foreground">{related.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{related.excerpt}</p>
                  </Link>
                ))
              ) : (
                <EmptyState
                  description="Related-document intelligence is reserved for a later phase."
                  title="No related documents"
                />
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Owner</p>
                <p className="text-sm font-semibold text-foreground">{detail.ownerDisplayName ?? "Not assigned"}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Author</p>
                <p className="text-sm font-semibold text-foreground">{detail.authorDisplayName ?? "Unknown"}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-sm font-semibold text-foreground">{formatDateTime(detail.publishedAt)}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="text-sm font-semibold text-foreground">{formatDateTime(detail.updatedAt)}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Last review</p>
                <p className="text-sm font-semibold text-foreground">{formatDate(detail.lastReviewedAt)}</p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Next review</p>
                <p className="text-sm font-semibold text-foreground">{formatDate(detail.nextReviewAt)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {detail.tags.length > 0 ? (
                detail.tags.map((tag) => <StatusBadge key={tag.id} label={tag.label} tone="muted" />)
              ) : (
                <EmptyState
                  description="This document does not have tags yet."
                  title="No tags"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Read acknowledgement</CardTitle>
              <CardDescription>
                Current-version acknowledgement status and foundation for future dashboards.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatusBadge
                label={
                  detail.readAcknowledgement.hasReadCurrentVersion
                    ? "Current version acknowledged"
                    : "Acknowledgement pending"
                }
                tone={detail.readAcknowledgement.hasReadCurrentVersion ? "success" : "warning"}
              />
              <p className="text-sm text-muted-foreground">
                {detail.readAcknowledgement.hasReadCurrentVersion
                  ? `Last acknowledged ${formatDateTime(detail.readAcknowledgement.readAt)}`
                  : "Use the acknowledgement action to confirm you have read the current version."}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-card/82">
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {detail.capability.canEdit ? (
                <Button asChild>
                  <Link href={buildHref(detailHref, resolvedSearchParams, { inspect: "meta", panel: "edit" })}>
                    Edit metadata
                  </Link>
                </Button>
              ) : null}
              {detail.capability.canEdit ? (
                <Button asChild variant="outline">
                  <Link href={buildHref(detailHref, resolvedSearchParams, { inspect: "meta", panel: "version" })}>
                    Create version
                  </Link>
                </Button>
              ) : null}
              {detail.capability.canManageAttachments ? (
                <Button asChild variant="outline">
                  <Link href={buildHref(detailHref, resolvedSearchParams, { inspect: "meta", panel: "attachment" })}>
                    Add attachment
                  </Link>
                </Button>
              ) : null}
              {detail.capability.canPublish && detail.status !== "published" ? (
                <Button asChild variant="outline">
                  <Link href={buildHref(detailHref, resolvedSearchParams, { inspect: "meta", panel: "publish" })}>
                    Publish
                  </Link>
                </Button>
              ) : null}
              {detail.capability.canArchive && detail.status !== "archived" ? (
                <Button asChild variant="outline">
                  <Link href={buildHref(detailHref, resolvedSearchParams, { inspect: "meta", panel: "archive" })}>
                    Archive
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
      {inspect ? (
        <DocumentInspectorDrawer
          closeHref={buildHref(detailHref, resolvedSearchParams, { inspect: undefined, panel: undefined })}
          open
          sections={[]}
          statusBadge={{
            label: detail.status.toUpperCase(),
            tone: getDocumentStatusTone(detail.status),
          }}
          subtitle={detail.description ?? "Document metadata, revision, access, and acknowledgement detail."}
          tabPanels={DocumentDrawerPanels({ detail })}
          title={detail.title}
        >
          <DocumentInspectorContent
            detail={detail}
            panel={panel}
            referenceData={referenceData}
            returnTo={buildHref(detailHref, resolvedSearchParams, { inspect, message: undefined, error: undefined })}
          />
        </DocumentInspectorDrawer>
      ) : null}
    </div>
  );
}
