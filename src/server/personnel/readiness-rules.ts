import { RuleEngineService } from "@/server/rules/service";
import type { RuleEvaluationContext, RuleEvaluationResult, RuleProvider } from "@/server/rules/types";

export type PersonnelReadinessFacts = {
  activeAssignment: boolean;
  attendanceRate: number | null;
  incompleteProfile: boolean;
  loaActive: boolean;
  missingRequiredQualifications: number;
  overdueRequiredQualifications: number;
  pendingPersonnelActions: number;
  profileStatusKey: string;
};

export type UnitReadinessFacts = {
  attendanceConcerns: number;
  inactiveLeadership: number;
  loaMembers: number;
  missingRequiredQualifications: number;
  pendingTransfers: number;
  trackedMembers: number;
  vacantLeadershipPositions: number;
};

function memberRule(input: {
  id: string;
  message: string;
  recommendedAction: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "PASS" | "WARNING" | "FAIL" | "NOT_APPLICABLE";
  title: string;
}): RuleEvaluationResult {
  return {
    category: "personnel",
    description: input.message,
    id: input.id,
    message: input.message,
    providerId: "personnel.member-readiness",
    recommendedAction: input.recommendedAction,
    relatedEntityId: null,
    relatedEntityType: "MemberProfile",
    severity: input.severity,
    status: input.status,
    timestamp: new Date(),
    title: input.title,
  };
}

function unitRule(input: {
  id: string;
  message: string;
  recommendedAction: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "PASS" | "WARNING" | "FAIL" | "NOT_APPLICABLE";
  title: string;
}): RuleEvaluationResult {
  return {
    category: "personnel",
    description: input.message,
    id: input.id,
    message: input.message,
    providerId: "personnel.unit-readiness",
    recommendedAction: input.recommendedAction,
    relatedEntityId: null,
    relatedEntityType: "Unit",
    severity: input.severity,
    status: input.status,
    timestamp: new Date(),
    title: input.title,
  };
}

export function createMemberReadinessProvider(): RuleProvider<RuleEvaluationContext & { facts: PersonnelReadinessFacts }> {
  return {
    category: "personnel",
    domain: "personnel-readiness",
    evaluate: (context) => {
      const facts = context.facts;

      return [
        memberRule({
          id: "member.active-assignment",
          message: facts.activeAssignment ? "Member has an active unit assignment." : "Member has no active unit assignment.",
          recommendedAction: "Assign a current unit and billet before treating the member as ready.",
          severity: facts.activeAssignment ? "LOW" : "HIGH",
          status: facts.activeAssignment ? "PASS" : "FAIL",
          title: "Active assignment",
        }),
        memberRule({
          id: "member.required-qualifications",
          message: `${facts.missingRequiredQualifications} required qualifications are missing.`,
          recommendedAction: "Review required unit and billet qualifications.",
          severity: facts.missingRequiredQualifications > 0 ? "HIGH" : "LOW",
          status: facts.missingRequiredQualifications > 0 ? "WARNING" : "PASS",
          title: "Required qualifications",
        }),
        memberRule({
          id: "member.attendance-policy",
          message:
            facts.attendanceRate === null
              ? "Attendance context is limited."
              : `Recent attendance is ${facts.attendanceRate}%.`,
          recommendedAction: "Review unit attendance policy and recent finalized events.",
          severity: facts.attendanceRate !== null && facts.attendanceRate < 70 ? "MEDIUM" : "LOW",
          status: facts.attendanceRate !== null && facts.attendanceRate < 70 ? "WARNING" : "PASS",
          title: "Attendance context",
        }),
        memberRule({
          id: "member.loa-status",
          message: facts.loaActive ? "Member has an active LOA record." : "No active LOA record affects readiness.",
          recommendedAction: "Review expected return date and attendance exclusions.",
          severity: facts.loaActive ? "MEDIUM" : "LOW",
          status: facts.loaActive ? "NOT_APPLICABLE" : "PASS",
          title: "LOA status",
        }),
        memberRule({
          id: "member.pending-actions",
          message: `${facts.pendingPersonnelActions} personnel actions are open.`,
          recommendedAction: "Resolve pending personnel actions before final readiness review.",
          severity: facts.pendingPersonnelActions > 0 ? "MEDIUM" : "LOW",
          status: facts.pendingPersonnelActions > 0 ? "WARNING" : "PASS",
          title: "Pending personnel actions",
        }),
      ];
    },
    id: "personnel.member-readiness",
    name: "Member Readiness Provider",
  };
}

export function createUnitReadinessProvider(): RuleProvider<RuleEvaluationContext & { facts: UnitReadinessFacts }> {
  return {
    category: "personnel",
    domain: "unit-readiness",
    evaluate: (context) => {
      const facts = context.facts;

      return [
        unitRule({
          id: "unit.strength",
          message: `${facts.trackedMembers} active members are tracked in this unit.`,
          recommendedAction: "Review assignment gaps and roster health.",
          severity: facts.trackedMembers > 0 ? "LOW" : "HIGH",
          status: facts.trackedMembers > 0 ? "PASS" : "FAIL",
          title: "Unit strength",
        }),
        unitRule({
          id: "unit.vacant-leadership",
          message: `${facts.vacantLeadershipPositions} leadership billets appear vacant.`,
          recommendedAction: "Assign leadership billets or mark them inactive.",
          severity: facts.vacantLeadershipPositions > 0 ? "MEDIUM" : "LOW",
          status: facts.vacantLeadershipPositions > 0 ? "WARNING" : "PASS",
          title: "Leadership billets",
        }),
        unitRule({
          id: "unit.qualification-gaps",
          message: `${facts.missingRequiredQualifications} required qualification gaps are visible.`,
          recommendedAction: "Review unit-scoped qualification requirements.",
          severity: facts.missingRequiredQualifications > 0 ? "HIGH" : "LOW",
          status: facts.missingRequiredQualifications > 0 ? "WARNING" : "PASS",
          title: "Qualification gaps",
        }),
        unitRule({
          id: "unit.attendance-concerns",
          message: `${facts.attendanceConcerns} attendance concerns need review.`,
          recommendedAction: "Review attendance policy, LOA exclusions, and recent no-shows.",
          severity: facts.attendanceConcerns > 0 ? "MEDIUM" : "LOW",
          status: facts.attendanceConcerns > 0 ? "WARNING" : "PASS",
          title: "Attendance concerns",
        }),
        unitRule({
          id: "unit.pending-transfers",
          message: `${facts.pendingTransfers} transfer requests are pending.`,
          recommendedAction: "Review transfer cases before assignment changes.",
          severity: facts.pendingTransfers > 0 ? "MEDIUM" : "LOW",
          status: facts.pendingTransfers > 0 ? "WARNING" : "PASS",
          title: "Pending transfers",
        }),
      ];
    },
    id: "personnel.unit-readiness",
    name: "Unit Readiness Provider",
  };
}

export async function evaluateMemberReadinessRules(facts: PersonnelReadinessFacts) {
  const service = new RuleEngineService();

  service.registerProvider(createMemberReadinessProvider());

  return service.evaluate({
    domain: "personnel-readiness",
    facts,
  });
}

export async function evaluateUnitReadinessRules(facts: UnitReadinessFacts) {
  const service = new RuleEngineService();

  service.registerProvider(createUnitReadinessProvider());

  return service.evaluate({
    domain: "unit-readiness",
    facts,
  });
}
