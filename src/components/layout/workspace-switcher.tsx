"use client";

import { BriefcaseBusiness } from "lucide-react";

import { selectWorkspaceAction } from "@/server/personas/actions";
import type { WorkspaceProfile } from "@/server/personas/types";

type WorkspaceSwitcherProps = {
  workspaceProfile: WorkspaceProfile;
};

export function WorkspaceSwitcher({ workspaceProfile }: WorkspaceSwitcherProps) {
  if (workspaceProfile.workspaceOptions.length <= 1) {
    return (
      <div className="hidden min-w-0 rounded-xl border border-border/70 bg-background/45 px-3 py-2 text-sm lg:block">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
        <p className="truncate font-semibold text-foreground">{workspaceProfile.selectedWorkspace.label}</p>
      </div>
    );
  }

  return (
    <form
      action={selectWorkspaceAction}
      aria-label="Switch workspace"
      className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-background/45 px-2 py-2"
    >
      <BriefcaseBusiness aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
      <label className="sr-only" htmlFor="workspaceId">
        Current workspace
      </label>
      <select
        className="min-w-0 max-w-[11rem] bg-transparent text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[14rem]"
        defaultValue={workspaceProfile.isAutomatic ? "automatic" : workspaceProfile.selectedWorkspace.id}
        id="workspaceId"
        name="workspaceId"
        title="Switch workspace"
      >
        <option value="automatic">Automatic: {workspaceProfile.selectedWorkspace.label}</option>
        {workspaceProfile.workspaceOptions.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.label}
          </option>
        ))}
      </select>
      <button
        className="rounded-lg border border-border/70 px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        type="submit"
      >
        Go
      </button>
    </form>
  );
}
