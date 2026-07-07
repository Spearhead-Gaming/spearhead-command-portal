import { PrismaClient } from "@prisma/client";

import {
  attendanceStatusCatalog,
  campaignStatusCatalog,
  documentCategoryCatalog,
  formTemplateTypeCatalog,
  profileStatusCatalog,
  qualificationCategoryCatalog,
  rankCatalog,
  spearheadUnitCatalog,
  starterRolePresets,
  submissionStatusCatalog,
  systemPermissionCatalog,
} from "../src/server/database/catalogs";

const prisma = new PrismaClient();

function getOptionalSeedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

const starterFormTemplates = [
  {
    key: "recruit-application",
    title: "Recruit Application",
    description: "Foundational application intake for prospective members entering the Spearhead pipeline.",
    formType: formTemplateTypeCatalog.find((entry) => entry.key === "recruit_application")!.key,
    fields: [
      { key: "discord-name", label: "Discord Name", fieldType: "discord_name", isRequired: true, sortOrder: 10 },
      { key: "steam-arma-id", label: "Steam / Arma ID", fieldType: "steam_arma_id", isRequired: true, sortOrder: 20 },
      { key: "timezone", label: "Timezone", fieldType: "short_text", isRequired: true, sortOrder: 30, placeholder: "Example: EST / UTC-5" },
      { key: "availability", label: "Availability", fieldType: "long_text", isRequired: true, sortOrder: 40, helpText: "Describe your normal weekly availability for trainings and operations." },
      { key: "experience", label: "Previous Milsim Experience", fieldType: "long_text", isRequired: false, sortOrder: 50 },
      { key: "preferred-unit", label: "Preferred Unit", fieldType: "unit_selector", isRequired: false, sortOrder: 60 },
      { key: "supporting-file", label: "Supporting File Placeholder", fieldType: "file_upload", isRequired: false, sortOrder: 70, helpText: "Reserved for future file-upload support. Do not rely on attachments yet." },
    ],
    approvalSteps: [
      { stepKey: "initial-review", title: "Initial Review", reviewerPermissionKey: "forms.review", reviewerUnitMode: "none", sortOrder: 10 },
    ],
  },
  {
    key: "unit-transfer-request",
    title: "Unit Transfer Request",
    description: "Member-initiated request for reassignment between units or detachments.",
    formType: formTemplateTypeCatalog.find((entry) => entry.key === "unit_transfer_request")!.key,
    fields: [
      { key: "discord-name", label: "Discord Name", fieldType: "discord_name", isRequired: true, sortOrder: 10 },
      { key: "current-unit", label: "Current Unit", fieldType: "unit_selector", isRequired: true, sortOrder: 20 },
      { key: "requested-unit", label: "Requested Unit", fieldType: "unit_selector", isRequired: true, sortOrder: 30 },
      { key: "requested-date", label: "Requested Effective Date", fieldType: "date", isRequired: false, sortOrder: 40 },
      { key: "reason", label: "Reason for Transfer", fieldType: "long_text", isRequired: true, sortOrder: 50 },
      { key: "leadership-aware", label: "I have informed my current leadership", fieldType: "checkbox", isRequired: false, sortOrder: 60 },
    ],
    approvalSteps: [
      { stepKey: "unit-review", title: "Unit Review", reviewerPermissionKey: "forms.review", reviewerUnitMode: "target_unit", sortOrder: 10 },
    ],
  },
  {
    key: "loa-request",
    title: "LOA Request",
    description: "Request leave of absence with timing and return expectations for roster planning.",
    formType: formTemplateTypeCatalog.find((entry) => entry.key === "loa_request")!.key,
    fields: [
      { key: "discord-name", label: "Discord Name", fieldType: "discord_name", isRequired: true, sortOrder: 10 },
      { key: "start-date", label: "LOA Start Date", fieldType: "date", isRequired: true, sortOrder: 20 },
      { key: "expected-return", label: "Expected Return Date", fieldType: "date", isRequired: false, sortOrder: 30 },
      { key: "loa-reason", label: "Reason", fieldType: "long_text", isRequired: true, sortOrder: 40 },
      { key: "contact-preference", label: "Preferred Check-In Method", fieldType: "radio", isRequired: false, sortOrder: 50, options: ["Discord DM", "Portal Comment", "No Follow-Up Needed"] },
    ],
    approvalSteps: [
      { stepKey: "leadership-review", title: "Leadership Review", reviewerPermissionKey: "forms.review", reviewerUnitMode: "target_unit", sortOrder: 10 },
    ],
  },
  {
    key: "staff-application",
    title: "Staff Application",
    description: "Apply for community staff or command-support responsibilities.",
    formType: formTemplateTypeCatalog.find((entry) => entry.key === "staff_application")!.key,
    fields: [
      { key: "discord-name", label: "Discord Name", fieldType: "discord_name", isRequired: true, sortOrder: 10 },
      { key: "steam-arma-id", label: "Steam / Arma ID", fieldType: "steam_arma_id", isRequired: false, sortOrder: 20 },
      { key: "staff-track", label: "Desired Staff Track", fieldType: "dropdown", isRequired: true, sortOrder: 30, options: ["S1", "S3", "Community", "Technical", "Other"] },
      { key: "experience", label: "Relevant Experience", fieldType: "long_text", isRequired: true, sortOrder: 40 },
      { key: "availability", label: "Staff Availability", fieldType: "long_text", isRequired: true, sortOrder: 50 },
    ],
    approvalSteps: [
      { stepKey: "staff-review", title: "Staff Review", reviewerPermissionKey: "forms.review", reviewerUnitMode: "none", sortOrder: 10 },
    ],
  },
  {
    key: "instructor-application",
    title: "Instructor Application",
    description: "Apply for instructor responsibilities supporting qualifications and training delivery.",
    formType: formTemplateTypeCatalog.find((entry) => entry.key === "instructor_application")!.key,
    fields: [
      { key: "discord-name", label: "Discord Name", fieldType: "discord_name", isRequired: true, sortOrder: 10 },
      { key: "primary-unit", label: "Primary Unit", fieldType: "unit_selector", isRequired: false, sortOrder: 20 },
      { key: "teaching-focus", label: "Teaching Focus", fieldType: "dropdown", isRequired: true, sortOrder: 30, options: ["Infantry", "Leadership", "Medical", "Aviation", "Staff Work"] },
      { key: "experience", label: "Instruction Experience", fieldType: "long_text", isRequired: true, sortOrder: 40 },
      { key: "availability", label: "Availability", fieldType: "long_text", isRequired: true, sortOrder: 50 },
    ],
    approvalSteps: [
      { stepKey: "instructor-review", title: "Instructor Review", reviewerPermissionKey: "forms.review", reviewerUnitMode: "target_unit", sortOrder: 10 },
    ],
  },
  {
    key: "rasp-application",
    title: "RASP Application Placeholder",
    description: "Placeholder submission type reserved for future RASP-specific review workflows.",
    formType: formTemplateTypeCatalog.find((entry) => entry.key === "rasp_application")!.key,
    fields: [
      { key: "discord-name", label: "Discord Name", fieldType: "discord_name", isRequired: true, sortOrder: 10 },
      { key: "target-unit", label: "Target Unit", fieldType: "unit_selector", isRequired: true, sortOrder: 20 },
      { key: "motivation", label: "Motivation", fieldType: "long_text", isRequired: true, sortOrder: 30 },
      { key: "availability", label: "Availability", fieldType: "long_text", isRequired: true, sortOrder: 40 },
      { key: "prior-experience", label: "Prior Experience", fieldType: "long_text", isRequired: false, sortOrder: 50 },
    ],
    approvalSteps: [
      { stepKey: "rasp-review", title: "RASP Review", reviewerPermissionKey: "forms.review", reviewerUnitMode: "target_unit", sortOrder: 10 },
    ],
  },
] as const;

async function seedProfileStatuses() {
  await Promise.all(
    profileStatusCatalog.map((status, index) =>
      prisma.profileStatus.upsert({
        where: { key: status.key },
        update: {
          label: status.label,
          description: status.description,
          sortOrder: index + 1,
          isActive: true,
        },
        create: {
          key: status.key,
          label: status.label,
          description: status.description,
          sortOrder: index + 1,
          isActive: true,
        },
      }),
    ),
  );
}

async function seedUnits() {
  for (const unit of spearheadUnitCatalog) {
    await prisma.unit.upsert({
      where: { key: unit.key },
      update: {
        name: unit.name,
        shortName: unit.shortName,
        sortOrder: unit.sortOrder,
        isActive: true,
      },
      create: {
        key: unit.key,
        name: unit.name,
        shortName: unit.shortName,
        sortOrder: unit.sortOrder,
        isActive: true,
      },
    });
  }

  for (const unit of spearheadUnitCatalog) {
    if (!unit.parentKey) {
      continue;
    }

    const parentUnit = await prisma.unit.findUniqueOrThrow({
      where: { key: unit.parentKey },
      select: { id: true },
    });

    await prisma.unit.update({
      where: { key: unit.key },
      data: { parentUnitId: parentUnit.id },
    });
  }
}

async function seedQualificationCategories() {
  await Promise.all(
    qualificationCategoryCatalog.map((category) =>
      prisma.qualificationCategory.upsert({
        where: { key: category.key },
        update: {
          label: category.label,
          description: category.description,
          sortOrder: category.sortOrder,
          isActive: true,
        },
        create: {
          key: category.key,
          label: category.label,
          description: category.description,
          sortOrder: category.sortOrder,
          isActive: true,
        },
      }),
    ),
  );
}

async function seedDocumentCategories() {
  await Promise.all(
    documentCategoryCatalog.map((category) =>
      prisma.documentCategory.upsert({
        where: { key: category.key },
        update: {
          label: category.label,
          description: category.description,
          sortOrder: category.sortOrder,
          isActive: true,
        },
        create: {
          key: category.key,
          label: category.label,
          description: category.description,
          sortOrder: category.sortOrder,
          isActive: true,
        },
      }),
    ),
  );
}

async function seedRanks() {
  await Promise.all(
    rankCatalog.map((rank) =>
      prisma.rank.upsert({
        where: { key: rank.key },
        update: {
          label: rank.label,
          abbreviation: rank.abbreviation,
          sortOrder: rank.sortOrder,
          isOfficer: rank.isOfficer,
          isActive: true,
        },
        create: {
          key: rank.key,
          label: rank.label,
          abbreviation: rank.abbreviation,
          sortOrder: rank.sortOrder,
          isOfficer: rank.isOfficer,
          isActive: true,
        },
      }),
    ),
  );
}

async function seedPermissions() {
  await Promise.all(
    systemPermissionCatalog.map((permission) =>
      prisma.permission.upsert({
        where: { key: permission.key },
        update: {
          label: permission.label,
          description: permission.description,
          module: permission.module,
          category: permission.category,
          isSystem: permission.isSystem,
        },
        create: {
          key: permission.key,
          label: permission.label,
          description: permission.description,
          module: permission.module,
          category: permission.category,
          isSystem: permission.isSystem,
        },
      }),
    ),
  );
}

async function seedSubmissionStatuses() {
  await Promise.all(
    submissionStatusCatalog.map((status) =>
      prisma.submissionStatus.upsert({
        where: { key: status.key },
        update: {
          label: status.label,
          description: status.description,
          sortOrder: status.sortOrder,
          isDefault: status.isDefault,
          isTerminal: status.isTerminal,
          isActive: true,
        },
        create: {
          key: status.key,
          label: status.label,
          description: status.description,
          sortOrder: status.sortOrder,
          isDefault: status.isDefault,
          isTerminal: status.isTerminal,
          isActive: true,
        },
      }),
    ),
  );
}

async function seedFormTemplates() {
  for (const template of starterFormTemplates) {
    const targetUnitId = null;
    const record = await prisma.formTemplate.upsert({
      where: { key: template.key },
      update: {
        title: template.title,
        description: template.description,
        formType: template.formType,
        targetUnitId,
        isEnabled: true,
        archivedAt: null,
        deletedAt: null,
      },
      create: {
        key: template.key,
        title: template.title,
        description: template.description,
        formType: template.formType,
        targetUnitId,
        isEnabled: true,
      },
      select: {
        id: true,
      },
    });

    await prisma.formField.deleteMany({
      where: {
        templateId: record.id,
        key: {
          notIn: template.fields.map((field) => field.key),
        },
      },
    });

    for (const field of template.fields) {
      await prisma.formField.upsert({
        where: {
          templateId_key: {
            templateId: record.id,
            key: field.key,
          },
        },
        update: {
          label: field.label,
          description: getOptionalSeedString("description" in field ? field.description : null),
          fieldType: field.fieldType,
          placeholder: getOptionalSeedString("placeholder" in field ? field.placeholder : null),
          helpText: getOptionalSeedString("helpText" in field ? field.helpText : null),
          options: "options" in field ? field.options ?? undefined : undefined,
          isRequired: field.isRequired,
          isEnabled: true,
          sortOrder: field.sortOrder,
        },
        create: {
          templateId: record.id,
          key: field.key,
          label: field.label,
          description: getOptionalSeedString("description" in field ? field.description : null),
          fieldType: field.fieldType,
          placeholder: getOptionalSeedString("placeholder" in field ? field.placeholder : null),
          helpText: getOptionalSeedString("helpText" in field ? field.helpText : null),
          options: "options" in field ? field.options ?? undefined : undefined,
          isRequired: field.isRequired,
          isEnabled: true,
          sortOrder: field.sortOrder,
        },
      });
    }

    await prisma.approvalStep.deleteMany({
      where: {
        templateId: record.id,
        stepKey: {
          notIn: template.approvalSteps.map((step) => step.stepKey),
        },
      },
    });

    for (const step of template.approvalSteps) {
      await prisma.approvalStep.upsert({
        where: {
          templateId_stepKey: {
            templateId: record.id,
            stepKey: step.stepKey,
          },
        },
        update: {
          title: step.title,
          reviewerPermissionKey: step.reviewerPermissionKey,
          reviewerUnitMode: step.reviewerUnitMode,
          sortOrder: step.sortOrder,
          isRequired: true,
          isActive: true,
        },
        create: {
          templateId: record.id,
          stepKey: step.stepKey,
          title: step.title,
          reviewerPermissionKey: step.reviewerPermissionKey,
          reviewerUnitMode: step.reviewerUnitMode,
          sortOrder: step.sortOrder,
          isRequired: true,
          isActive: true,
        },
      });
    }
  }
}

async function seedRoles() {
  const permissions = await prisma.permission.findMany({
    select: {
      id: true,
      key: true,
    },
  });

  const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));

  for (const preset of starterRolePresets) {
    const role = await prisma.role.upsert({
      where: { name: preset.name },
      update: {
        label: preset.label,
        description: preset.description,
        isSystem: true,
        isActive: true,
      },
      create: {
        name: preset.name,
        label: preset.label,
        description: preset.description,
        isSystem: true,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    const permissionKeys = preset.grantsAllSystemPermissions
      ? systemPermissionCatalog.map((permission) => permission.key)
      : [...(preset.permissionKeys ?? [])];

    const permissionIds = permissionKeys.map((permissionKey) => {
      const permissionId = permissionIdByKey.get(permissionKey);

      if (!permissionId) {
        throw new Error(`Missing seeded permission for role preset: ${permissionKey}`);
      }

      return permissionId;
    });

    await prisma.rolePermission.deleteMany({
      where:
        permissionIds.length > 0
          ? {
              roleId: role.id,
              permissionId: {
                notIn: permissionIds,
              },
            }
          : {
              roleId: role.id,
            },
    });

    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId,
        },
      });
    }
  }
}

async function main() {
  await seedProfileStatuses();
  await seedUnits();
  await seedRanks();
  await seedQualificationCategories();
  await seedDocumentCategories();
  await seedPermissions();
  await seedSubmissionStatuses();
  await seedRoles();
  await seedFormTemplates();

  // Position seed data remains intentionally deferred until the docs confirm
  // the canonical Spearhead billet definitions for each unit.

  // Campaign and attendance statuses are intentionally modeled as shared catalogs,
  // not database tables, until the workflow rules are finalized for later milestones.
  console.info("Campaign status catalog:", campaignStatusCatalog.join(", "));
  console.info("Attendance RSVP status catalog:", attendanceStatusCatalog.rsvp.join(", "));
  console.info("Attendance final status catalog:", attendanceStatusCatalog.final.join(", "));
  console.info("Submission status catalog:", submissionStatusCatalog.map((status) => status.key).join(", "));

  // Authentication users, Discord server IDs, channel mappings, and other live
  // integration records stay unseeded until those milestones are implemented.
  console.info("Seed complete: system records are safe to re-run without duplication.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
