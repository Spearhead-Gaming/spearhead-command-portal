import {
  archiveDocumentAction,
  createDocumentAction,
  createDocumentCategoryAction,
  createVersionAction,
  deleteAttachmentAction,
  duplicateDocumentAction,
  manageDocumentPermissionAction,
  publishDocumentAction,
  recordReadReceiptAction,
  removeDocumentPermissionAction,
  restoreDocumentAction,
  updateDocumentAction,
  uploadAttachmentAction,
} from "@/server/documents/actions";
import type {
  DocumentDetail,
  DocumentReferenceData,
} from "@/server/documents/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const fieldClassName =
  "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const textareaClassName =
  "flex min-h-24 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const labelClassName =
  "text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground";

function SelectField({
  name,
  label,
  options,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  options: Array<{ id: string; label: string; hint?: string | null }>;
  defaultValue?: string | null;
  placeholder: string;
}) {
  return (
    <label className="space-y-2">
      <span className={labelClassName}>{label}</span>
      <select className={fieldClassName} defaultValue={defaultValue ?? ""} name={name}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
            {option.hint ? ` - ${option.hint}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/45 px-4 py-3 text-sm text-foreground">
      <input
        className="h-4 w-4 rounded border-border bg-input"
        defaultChecked={defaultChecked}
        name={name}
        type="checkbox"
        value="true"
      />
      <span>{label}</span>
    </label>
  );
}

function FormShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/80 bg-card/92">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function DocumentFields({
  referenceData,
  document,
}: {
  referenceData: DocumentReferenceData;
  document?: DocumentDetail | null;
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={labelClassName}>Title</span>
          <input className={fieldClassName} defaultValue={document?.title ?? ""} name="title" required />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Slug</span>
          <input className={fieldClassName} defaultValue={document?.slug ?? ""} name="slug" placeholder="Optional auto-generated slug" />
        </label>
      </div>
      <label className="space-y-2">
        <span className={labelClassName}>Description</span>
        <textarea className={textareaClassName} defaultValue={document?.description ?? ""} name="description" />
      </label>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SelectField
          defaultValue={document?.category?.id ?? null}
          label="Category"
          name="categoryId"
          options={referenceData.categories}
          placeholder="Select category"
        />
        <SelectField
          defaultValue={document?.unitId ?? null}
          label="Owning unit"
          name="unitId"
          options={referenceData.units}
          placeholder="Optional unit"
        />
        <SelectField
          defaultValue={document?.ownerUserId ?? null}
          label="Owner"
          name="ownerUserId"
          options={referenceData.owners}
          placeholder="Default to current user"
        />
        <label className="space-y-2">
          <span className={labelClassName}>Visibility</span>
          <select
            className={fieldClassName}
            defaultValue={document?.visibility ?? "members"}
            name="visibility"
          >
            <option value="public">Public</option>
            <option value="members">Members</option>
            <option value="unit">Unit</option>
            <option value="restricted">Restricted</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>
      {!document ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClassName}>Initial status</span>
            <select className={fieldClassName} defaultValue="draft" name="status">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClassName}>Editor format</span>
            <select className={fieldClassName} defaultValue="markdown" name="bodyFormat">
              <option value="markdown">Markdown</option>
              <option value="richtext">Rich text placeholder</option>
              <option value="blocks">Block editor placeholder</option>
            </select>
          </label>
        </div>
      ) : null}
      {!document ? (
        <label className="space-y-2">
          <span className={labelClassName}>Initial body</span>
          <textarea
            className="flex min-h-40 w-full rounded-lg border border-border bg-input px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            name="body"
            placeholder="Write the first version of the document here."
          />
        </label>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={labelClassName}>Last review date</span>
          <input
            className={fieldClassName}
            defaultValue={document?.lastReviewedAt ? document.lastReviewedAt.toISOString().slice(0, 10) : ""}
            name="lastReviewedAt"
            type="date"
          />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Next review date</span>
          <input
            className={fieldClassName}
            defaultValue={document?.nextReviewAt ? document.nextReviewAt.toISOString().slice(0, 10) : ""}
            name="nextReviewAt"
            type="date"
          />
        </label>
      </div>
      <label className="space-y-2">
        <span className={labelClassName}>Tags</span>
        <input
          className={fieldClassName}
          defaultValue={document?.tags.map((tag) => tag.label).join(", ") ?? ""}
          name="tags"
          placeholder="Comma-separated tags"
        />
      </label>
      <CheckboxField defaultChecked={document?.isPinned ?? false} label="Pin document in library widgets" name="isPinned" />
      <label className="space-y-2">
        <span className={labelClassName}>Initial access rule, optional</span>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Permission key"
            name="permissionKey"
            options={referenceData.permissionKeys}
            placeholder="Optional permission"
          />
          <SelectField
            label="Permission unit"
            name="permissionUnitId"
            options={referenceData.units}
            placeholder="Optional unit scope"
          />
        </div>
      </label>
      <label className="space-y-2">
        <span className={labelClassName}>Permission notes</span>
        <textarea className={textareaClassName} name="permissionNotes" placeholder="Optional access context" />
      </label>
    </>
  );
}

export function CreateDocumentForm({
  referenceData,
  returnTo,
}: {
  referenceData: DocumentReferenceData;
  returnTo: string;
}) {
  return (
    <form action={createDocumentAction} className="space-y-4">
      <input name="returnTo" type="hidden" value={returnTo} />
      <DocumentFields referenceData={referenceData} />
      <label className="space-y-2">
        <span className={labelClassName}>Reason</span>
        <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
      </label>
      <Button type="submit">Create document</Button>
    </form>
  );
}

export function EditDocumentForm({
  detail,
  referenceData,
  returnTo,
}: {
  detail: DocumentDetail;
  referenceData: DocumentReferenceData;
  returnTo: string;
}) {
  return (
    <form action={updateDocumentAction} className="space-y-4">
      <input name="documentId" type="hidden" value={detail.id} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <DocumentFields document={detail} referenceData={referenceData} />
      <label className="space-y-2">
        <span className={labelClassName}>Reason</span>
        <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
      </label>
      <Button type="submit">Save document</Button>
    </form>
  );
}

export function CreateVersionForm({
  detail,
  returnTo,
}: {
  detail: DocumentDetail;
  returnTo: string;
}) {
  return (
    <form action={createVersionAction} className="space-y-4">
      <input name="documentId" type="hidden" value={detail.id} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="space-y-2">
        <span className={labelClassName}>Editor format</span>
        <select className={fieldClassName} defaultValue={detail.bodyFormat} name="bodyFormat">
          <option value="markdown">Markdown</option>
          <option value="richtext">Rich text placeholder</option>
          <option value="blocks">Block editor placeholder</option>
        </select>
      </label>
      <label className="space-y-2">
        <span className={labelClassName}>Version body</span>
        <textarea
          className="flex min-h-40 w-full rounded-lg border border-border bg-input px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          defaultValue={detail.body ?? ""}
          name="body"
        />
      </label>
      <label className="space-y-2">
        <span className={labelClassName}>Change summary</span>
        <input className={fieldClassName} name="changeSummary" placeholder="What changed in this revision?" />
      </label>
      <label className="space-y-2">
        <span className={labelClassName}>Reason</span>
        <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
      </label>
      <Button type="submit">Create version</Button>
    </form>
  );
}

export function UploadAttachmentForm({
  detail,
  returnTo,
}: {
  detail: DocumentDetail;
  returnTo: string;
}) {
  return (
    <form action={uploadAttachmentAction} className="space-y-4">
      <input name="documentId" type="hidden" value={detail.id} />
      <input name="documentVersionId" type="hidden" value={detail.readAcknowledgement.currentVersionId ?? ""} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={labelClassName}>Label</span>
          <input className={fieldClassName} name="label" placeholder="Attachment label" required />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>File name</span>
          <input className={fieldClassName} name="fileName" placeholder="SOP-v1.pdf" required />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2">
          <span className={labelClassName}>MIME type</span>
          <input className={fieldClassName} name="mimeType" placeholder="application/pdf" required />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Size bytes</span>
          <input className={fieldClassName} min="0" name="sizeBytes" type="number" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Storage key</span>
          <input className={fieldClassName} name="storageKey" placeholder="future/storage/key" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Source URL</span>
          <input className={fieldClassName} name="sourceUrl" placeholder="https://..." />
        </label>
      </div>
      <label className="space-y-2">
        <span className={labelClassName}>Description</span>
        <textarea className={textareaClassName} name="description" placeholder="Preview remains placeholder-only in this phase." />
      </label>
      <label className="space-y-2">
        <span className={labelClassName}>Reason</span>
        <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
      </label>
      <Button type="submit">Add attachment</Button>
    </form>
  );
}

export function ManageDocumentPermissionForm({
  detail,
  referenceData,
  returnTo,
}: {
  detail: DocumentDetail;
  referenceData: DocumentReferenceData;
  returnTo: string;
}) {
  return (
    <div className="space-y-4">
      <form action={manageDocumentPermissionAction} className="space-y-4">
        <input name="documentId" type="hidden" value={detail.id} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Permission key"
            name="permissionKey"
            options={referenceData.permissionKeys}
            placeholder="Select permission"
          />
          <SelectField
            label="Unit scope"
            name="unitId"
            options={referenceData.units}
            placeholder="Optional unit"
          />
        </div>
        <label className="space-y-2">
          <span className={labelClassName}>Notes</span>
          <textarea className={textareaClassName} name="notes" placeholder="Optional access note" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Reason</span>
          <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
        </label>
        <Button type="submit">Add access rule</Button>
      </form>
      {detail.permissions.length > 0 ? (
        <div className="space-y-3">
          {detail.permissions.map((permission) => (
            <Card key={permission.id} className="border-border/70 bg-background/45">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{permission.permissionKey}</p>
                  <p className="text-sm text-muted-foreground">
                    {permission.unitShortName ? `Scoped to ${permission.unitShortName}` : "Global permission rule"}
                  </p>
                </div>
                <form action={removeDocumentPermissionAction}>
                  <input name="documentPermissionId" type="hidden" value={permission.id} />
                  <input name="returnTo" type="hidden" value={returnTo} />
                  <Button type="submit" variant="outline">
                    Remove
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ReadAcknowledgementForm({
  detail,
  returnTo,
}: {
  detail: DocumentDetail;
  returnTo: string;
}) {
  return (
    <form action={recordReadReceiptAction}>
      <input name="documentId" type="hidden" value={detail.id} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <Button type="submit" variant={detail.readAcknowledgement.hasReadCurrentVersion ? "outline" : "default"}>
        {detail.readAcknowledgement.hasReadCurrentVersion ? "Refresh acknowledgement" : "Acknowledge current version"}
      </Button>
    </form>
  );
}

export function PublishDocumentForm({
  documentId,
  returnTo,
}: {
  documentId: string;
  returnTo: string;
}) {
  return (
    <form action={publishDocumentAction}>
      <input name="documentId" type="hidden" value={documentId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <Button type="submit">Publish document</Button>
    </form>
  );
}

export function ArchiveDocumentForm({
  documentId,
  returnTo,
}: {
  documentId: string;
  returnTo: string;
}) {
  return (
    <form action={archiveDocumentAction}>
      <input name="documentId" type="hidden" value={documentId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <Button type="submit" variant="outline">
        Archive document
      </Button>
    </form>
  );
}

export function RestoreDocumentForm({
  documentId,
  returnTo,
}: {
  documentId: string;
  returnTo: string;
}) {
  return (
    <form action={restoreDocumentAction}>
      <input name="documentId" type="hidden" value={documentId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <Button type="submit" variant="outline">
        Restore document
      </Button>
    </form>
  );
}

export function DuplicateDocumentForm({
  documentId,
  returnTo,
}: {
  documentId: string;
  returnTo: string;
}) {
  return (
    <form action={duplicateDocumentAction}>
      <input name="documentId" type="hidden" value={documentId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <Button type="submit" variant="outline">
        Duplicate document
      </Button>
    </form>
  );
}

export function DeleteAttachmentForm({
  attachmentId,
  returnTo,
}: {
  attachmentId: string;
  returnTo: string;
}) {
  return (
    <form action={deleteAttachmentAction}>
      <input name="attachmentId" type="hidden" value={attachmentId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <Button type="submit" variant="ghost">
        Remove
      </Button>
    </form>
  );
}

export function CreateDocumentCategoryForm({
  returnTo,
}: {
  returnTo: string;
}) {
  return (
    <form action={createDocumentCategoryAction} className="space-y-4">
      <input name="returnTo" type="hidden" value={returnTo} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={labelClassName}>Key</span>
          <input className={fieldClassName} name="key" placeholder="sop" required />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Label</span>
          <input className={fieldClassName} name="label" placeholder="SOP" required />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className={labelClassName}>Sort order</span>
          <input className={fieldClassName} min="0" name="sortOrder" type="number" />
        </label>
        <label className="space-y-2">
          <span className={labelClassName}>Description</span>
          <input className={fieldClassName} name="description" placeholder="Category purpose" />
        </label>
      </div>
      <label className="space-y-2">
        <span className={labelClassName}>Reason</span>
        <textarea className={textareaClassName} name="reason" placeholder="Optional audit note" />
      </label>
      <Button type="submit">Create category</Button>
    </form>
  );
}

export function DocumentFormShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return <FormShell description={description} title={title}>{children}</FormShell>;
}
