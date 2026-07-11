import type { Prisma } from "@prisma/client";

export type CasePriority = "critical" | "high" | "medium" | "low" | "informational";
export type CaseConfidentiality = "standard" | "restricted" | "command_only" | "administrator_only";
export type CaseStatus =
  | "draft"
  | "open"
  | "under_review"
  | "awaiting_information"
  | "pending_decision"
  | "resolved"
  | "dismissed"
  | "appealed"
  | "reopened"
  | "closed"
  | "archived";

export type CaseTypeId =
  | "MODERATION"
  | "INCIDENT"
  | "APPEAL"
  | "ADMINISTRATIVE_REVIEW"
  | "COACHING"
  | "MEMBER_CONCERN"
  | "TRANSFER_REVIEW"
  | "LOA_REVIEW"
  | "QUALIFICATION_EXCEPTION"
  | "PROFILE_CORRECTION";

export type CaseTypeDefinition = {
  allowedStatuses: CaseStatus[];
  allowedTransitions: Record<CaseStatus, CaseStatus[]>;
  assignmentPermission?: string;
  closureRequirements: string[];
  defaultPriority: CasePriority;
  description: string;
  displayName: string;
  evidenceRequired: boolean;
  id: CaseTypeId;
  notificationHooks: string[];
  owningDomain: string;
  permissionRequirements: {
    create: string;
    manage: string;
    view: string;
  };
};

export type CaseCreateInput = {
  caseType: CaseTypeId;
  confidentiality?: CaseConfidentiality;
  description?: string | null;
  dueAt?: Date | null;
  owningUnitId?: string | null;
  priority?: CasePriority;
  relatedDiscordUserId?: string | null;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  relatedMemberId?: string | null;
  summary: string;
  title: string;
};

export type CommunityManagementCaseListItem = {
  assignedToName: string | null;
  caseNumber: string;
  caseType: string;
  confidentiality: string;
  createdAt: Date;
  dueAt: Date | null;
  id: string;
  latestTimeline: string | null;
  priority: string;
  relatedMemberName: string | null;
  status: string;
  title: string;
};

export type CommunityHealthIndicator = {
  hint: string;
  label: string;
  tone: "info" | "success" | "warning" | "danger" | "muted";
  value: string;
};

export type CommunityManagementCenterData = {
  appeals: CommunityManagementCaseListItem[];
  cases: CommunityManagementCaseListItem[];
  caseTypes: CaseTypeDefinition[];
  healthIndicators: CommunityHealthIndicator[];
  moderationActions: Array<{
    action: string;
    createdAt: Date;
    errorMessage: string | null;
    id: string;
    reason: string;
    result: string;
    targetDiscordUserId: string;
  }>;
  reference: {
    discordServers: Array<{
      id: string;
      name: string;
    }>;
    members: Array<{
      displayName: string;
      id: string;
      userId: string | null;
    }>;
    users: Array<{
      displayName: string;
      id: string;
    }>;
  };
  queues: {
    awaitingAssignment: number;
    awaitingDecision: number;
    criticalCases: number;
    openCases: number;
    overdueCases: number;
    pendingAppeals: number;
  };
  recommendations: Array<{
    id: string;
    priority: CasePriority;
    recommendedAction: string;
    relatedEntityId: string | null;
    relatedEntityType: string | null;
    title: string;
  }>;
  ruleSignals: Array<{
    id: string;
    message: string;
    recommendedAction: string;
    severity: string;
    status: string;
    title: string;
  }>;
  staffWorkload: Array<{
    assignedCount: number;
    userId: string;
    userName: string;
  }>;
};

export type CaseJson = Prisma.InputJsonValue;
