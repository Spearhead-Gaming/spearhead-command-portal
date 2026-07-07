import type { patrolStatusCatalog, patrolTypeCatalog } from "@/server/database/catalogs";

export type PatrolTypeKey = (typeof patrolTypeCatalog)[number]["key"];
export type PatrolStatusKey = (typeof patrolStatusCatalog)[number]["key"];

export type PatrolReferenceData = {
  currentDeploymentId: string | null;
  currentWeek: number;
  deployments: Array<{
    id: string;
    label: string;
    status: string;
  }>;
  members: Array<{
    id: string;
    label: string;
    unitLabel: string | null;
  }>;
  patrolTypes: Array<{
    key: PatrolTypeKey;
    label: string;
    description: string;
  }>;
};

export type PatrolListItem = {
  id: string;
  title: string;
  description: string | null;
  patrolType: string | null;
  patrolTypeLabel: string;
  patrolStatus: string;
  patrolStatusLabel: string;
  patrolCallsign: string | null;
  deploymentWeek: number | null;
  estimatedDurationMinutes: number | null;
  startsAt: Date;
  endsAt: Date | null;
  leaderName: string | null;
  campaign: {
    id: string;
    title: string;
  } | null;
  interestedCount: number;
  participantCount: number;
  aarStatusLabel: string;
  hasMapScreenshot: boolean;
  participants: Array<{
    id: string;
    memberProfileId: string;
    name: string;
    unitLabel: string | null;
  }>;
  rsvps: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  latestAar: {
    id: string;
    status: string;
    statusLabel: string;
    progressionNotes: string | null;
    nextVersionRecommendation: string | null;
  } | null;
};

export type PatrolDashboardData = {
  activePatrols: PatrolListItem[];
  awaitingAar: PatrolListItem[];
  awaitingReview: PatrolListItem[];
  completedPatrols: PatrolListItem[];
  patrols: PatrolListItem[];
  summary: {
    active: number;
    awaitingAar: number;
    awaitingReview: number;
    completed: number;
  };
};
