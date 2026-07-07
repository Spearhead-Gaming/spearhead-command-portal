import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addPatrolParticipantAction,
  completePatrolAction,
  recordPatrolInterestAction,
  removePatrolParticipantAction,
  startPatrolAction,
} from "@/server/patrols/actions";
import type { PatrolReferenceData } from "@/server/patrols/types";

const fieldClassName =
  "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const textAreaClassName =
  "flex min-h-24 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function StartPatrolForm({
  referenceData,
  returnTo,
}: {
  referenceData: PatrolReferenceData;
  returnTo: string;
}) {
  return (
    <form action={startPatrolAction} className="space-y-4">
      <input name="returnTo" type="hidden" value={returnTo} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-foreground">
          Deployment
          <select
            className={fieldClassName}
            defaultValue={referenceData.currentDeploymentId ?? ""}
            name="campaignId"
          >
            <option value="">Current / unassigned</option>
            {referenceData.deployments.map((deployment) => (
              <option key={deployment.id} value={deployment.id}>
                {deployment.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-foreground">
          Operational Week
          <Input
            defaultValue={referenceData.currentWeek}
            min={1}
            name="deploymentWeek"
            type="number"
          />
        </label>
      </div>
      <label className="space-y-2 text-sm font-medium text-foreground">
        Patrol Name
        <Input
          autoFocus
          name="patrolName"
          placeholder="Example: Route Leopard Recon"
          required
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-foreground">
          Patrol Type
          <select className={fieldClassName} defaultValue="recon" name="patrolType">
            {referenceData.patrolTypes.map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-foreground">
          Estimated Duration
          <select className={fieldClassName} defaultValue="60" name="estimatedDurationMinutes">
            <option value="30">30 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
            <option value="120">2 hours</option>
            <option value="">Unknown</option>
          </select>
        </label>
      </div>
      <label className="space-y-2 text-sm font-medium text-foreground">
        Description
        <textarea
          className={textAreaClassName}
          name="description"
          placeholder="Optional quick intent, route, or staging note."
        />
      </label>
      <div className="flex flex-wrap justify-end gap-3">
        <Button asChild type="button" variant="ghost">
          <Link href="/operations/patrols">Cancel</Link>
        </Button>
        <Button type="submit">Start Patrol</Button>
      </div>
    </form>
  );
}

export function CompletePatrolForm({
  patrolId,
  returnTo,
}: {
  patrolId: string;
  returnTo: string;
}) {
  return (
    <form action={completePatrolAction} className="flex flex-wrap items-center gap-2">
      <input name="patrolId" type="hidden" value={patrolId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <Button size="sm" type="submit" variant="outline">
        Complete Patrol
      </Button>
    </form>
  );
}

export function RecordPatrolInterestForm({
  patrolId,
  returnTo,
}: {
  patrolId: string;
  returnTo: string;
}) {
  return (
    <form action={recordPatrolInterestAction}>
      <input name="patrolId" type="hidden" value={patrolId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <Button size="sm" type="submit" variant="ghost">
        Interested
      </Button>
    </form>
  );
}

export function AddPatrolParticipantForm({
  patrolId,
  referenceData,
  returnTo,
}: {
  patrolId: string;
  referenceData: PatrolReferenceData;
  returnTo: string;
}) {
  return (
    <form action={addPatrolParticipantAction} className="space-y-3">
      <input name="patrolId" type="hidden" value={patrolId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="space-y-2 text-sm font-medium text-foreground">
        Confirmed Participant
        <select className={fieldClassName} name="memberProfileId" required>
          <option value="">Select member</option>
          {referenceData.members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.label}
              {member.unitLabel ? ` - ${member.unitLabel}` : ""}
            </option>
          ))}
        </select>
      </label>
      <Input name="notes" placeholder="Optional participant note" />
      <Button size="sm" type="submit">
        Add Participant
      </Button>
    </form>
  );
}

export function RemovePatrolParticipantForm({
  participantId,
  returnTo,
}: {
  participantId: string;
  returnTo: string;
}) {
  return (
    <form action={removePatrolParticipantAction}>
      <input name="participantId" type="hidden" value={participantId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <Button size="sm" type="submit" variant="ghost">
        Remove
      </Button>
    </form>
  );
}
