export const unitPermissions = {
  unitsIndex: ["units.view"],
  unitDetail: [
    "units.view",
    "units.dashboard.view",
    "units.edit",
    "units.positions.view",
    "units.slots.manage",
  ],
} as const;
