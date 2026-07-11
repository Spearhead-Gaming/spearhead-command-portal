import type { RuleEvaluationResult } from "@/server/rules/types";

export type PersonnelCenterData = {
  actions: Array<{
    actionType: string;
    dueAt: Date | null;
    id: string;
    priority: string;
    status: string;
    summary: string;
    title: string;
  }>;
  attendanceConcerns: Array<{
    attendanceRate: number | null;
    displayName: string;
    id: string;
    unitShortName: string | null;
  }>;
  capabilities: {
    canManageActions: boolean;
    canManageAttendancePolicies: boolean;
    canReviewLeave: boolean;
    canReviewTransfers: boolean;
    canSubmitLeave: boolean;
    canSubmitTransfers: boolean;
  };
  loaReturns: Array<{
    expectedReturnAt: Date | null;
    id: string;
    memberDisplayName: string;
    status: string;
  }>;
  membersNeedingAttention: Array<{
    displayName: string;
    id: string;
    reasons: string[];
    unitShortName: string | null;
  }>;
  metrics: {
    activeMembers: number;
    expiringQualifications: number;
    loaMembers: number;
    missingQualifications: number;
    pendingPersonnelActions: number;
    totalMembers: number;
    vacantLeadershipPositions: number;
  };
  pendingTransfers: Array<{
    createdAt: Date;
    currentUnitShortName: string | null;
    id: string;
    memberDisplayName: string;
    requestedUnitShortName: string;
    status: string;
  }>;
  readinessRules: RuleEvaluationResult[];
  reference: {
    members: Array<{ displayName: string; id: string }>;
    units: Array<{ id: string; label: string }>;
  };
  unitReadiness: Array<{
    activeMembers: number;
    id: string;
    missingRequiredQualifications: number;
    name: string;
    readinessLabel: string;
    shortName: string;
    vacantLeadershipPositions: number;
  }>;
};
