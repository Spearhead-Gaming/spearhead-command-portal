export const discordApplicationTypeKeys = [
  "recruit_application",
  "rasp_application",
  "unit_transfer_request",
  "staff_application",
  "instructor_application",
  "zeus_application",
  "training_request",
  "qualification_exception",
  "community_form",
  "custom_application",
] as const;

export type DiscordApplicationTypeKey = (typeof discordApplicationTypeKeys)[number];

export type ApplicationEligibilityStatus =
  | "Eligible"
  | "Ineligible"
  | "NeedsReview"
  | "AlreadyApplied"
  | "ApplicationUnavailable"
  | "IdentityRequired"
  | "NotApplicable";

export type ApplicationEligibilityResult = {
  blockingReasons: string[];
  directPortalUrl: string | null;
  explanation: string;
  nextAction: string;
  remainingDays?: number | null;
  requiredRuleIds: string[];
  status: ApplicationEligibilityStatus;
  warnings: string[];
};

export type DiscordApplicationCatalogItem = {
  applicantScope: string;
  applicationTypeKey: DiscordApplicationTypeKey;
  availability: string;
  communicationDomain: string;
  description: string;
  discordStartBehavior: string;
  displayName: string;
  enabled: boolean;
  eligibility: ApplicationEligibilityResult;
  maintenanceMode: boolean;
  owningDomain: string;
  phase5ProviderKey: string | null;
  portalRoute: string;
  reviewDestination: string | null;
  templateId: string | null;
};
