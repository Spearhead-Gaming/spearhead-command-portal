export const trainingPermissions = {
  qualificationMatrix: [
    "qualifications.matrix.view",
    "qualifications.record.award",
    "qualifications.record.revoke",
    "qualifications.requirements.manage",
  ],
  trainingEvents: ["qualifications.view"],
  instructors: ["qualifications.view"],
} as const;
