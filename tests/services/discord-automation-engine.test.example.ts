import assert from "node:assert/strict";

type PlannedAutomation = {
  executionMode: "preview_only" | "manual_approval" | "automatic";
  hasRoleMapping: boolean;
  idempotencyKey: string;
  isExceptionActive: boolean;
  roleId: string | null;
};

function canExecuteRoleAutomation(plan: PlannedAutomation) {
  if (!plan.hasRoleMapping || !plan.roleId) {
    return false;
  }

  if (plan.isExceptionActive) {
    return false;
  }

  return plan.executionMode !== "preview_only";
}

function isSafeDefaultExecutionMode(mode: PlannedAutomation["executionMode"]) {
  return mode === "preview_only" || mode === "manual_approval";
}

function hasStableIdempotencyKey(actions: PlannedAutomation[]) {
  return new Set(actions.map((action) => action.idempotencyKey)).size === actions.length;
}

// Example contract tests for a future real service test runner.
const qualificationAwardPlan: PlannedAutomation = {
  executionMode: "manual_approval",
  hasRoleMapping: true,
  idempotencyKey: "qualification.awarded:qual-1:member-1:guild-1:role-1",
  isExceptionActive: false,
  roleId: "role-1",
};

assert.equal(isSafeDefaultExecutionMode("preview_only"), true);
assert.equal(isSafeDefaultExecutionMode("manual_approval"), true);
assert.equal(isSafeDefaultExecutionMode("automatic"), false);
assert.equal(canExecuteRoleAutomation(qualificationAwardPlan), true);
assert.equal(canExecuteRoleAutomation({ ...qualificationAwardPlan, hasRoleMapping: false }), false);
assert.equal(canExecuteRoleAutomation({ ...qualificationAwardPlan, isExceptionActive: true }), false);
assert.equal(canExecuteRoleAutomation({ ...qualificationAwardPlan, executionMode: "preview_only" }), false);
assert.equal(
  hasStableIdempotencyKey([
    qualificationAwardPlan,
    { ...qualificationAwardPlan, idempotencyKey: "qualification.revoked:qual-1:member-1:guild-1:role-1" },
  ]),
  true,
);

