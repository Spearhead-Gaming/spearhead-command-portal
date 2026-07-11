import { prisma } from "@/server/database/client";

const defaultTemplates = [
  {
    bodyTemplate: "{{title}}\n\n{{body}}",
    category: "deployments",
    key: "deployment.published",
    subjectTemplate: "{{title}}",
    title: "Deployment Published",
  },
  {
    bodyTemplate: "{{title}}\n\n{{body}}",
    category: "operations",
    key: "weekend_operation.published",
    subjectTemplate: "{{title}}",
    title: "Weekend Operation Published",
  },
  {
    bodyTemplate: "{{title}}\n\n{{body}}",
    category: "patrols",
    key: "patrol.started",
    subjectTemplate: "{{title}}",
    title: "Patrol Started",
  },
  {
    bodyTemplate: "{{title}}\n\n{{body}}",
    category: "patrols",
    key: "patrol.completed",
    subjectTemplate: "{{title}}",
    title: "Patrol Completed",
  },
  {
    bodyTemplate: "{{title}}\n\n{{body}}",
    category: "aar",
    key: "patrol.aar_required",
    subjectTemplate: "{{title}}",
    title: "Patrol AAR Required",
  },
  {
    bodyTemplate: "{{title}}\n\n{{body}}",
    category: "qualifications",
    key: "qualification.awarded",
    subjectTemplate: "{{title}}",
    title: "Qualification Awarded",
  },
  {
    bodyTemplate: "{{title}}\n\n{{body}}",
    category: "community",
    key: "community.announcement",
    subjectTemplate: "{{title}}",
    title: "Community Announcement",
  },
  {
    bodyTemplate: "{{title}}\n\n{{body}}",
    category: "system",
    key: "system.alert",
    subjectTemplate: "{{title}}",
    title: "System Alert",
  },
] as const;

function variableMapFromJson(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, entry === null || entry === undefined ? "" : String(entry)]),
  );
}

function renderString(template: string, variables: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => variables[key] ?? "");
}

export async function ensureDefaultCommunicationTemplates() {
  await Promise.all(
    defaultTemplates.map((template) =>
      prisma.communicationTemplate.upsert({
        create: template,
        update: {},
        where: {
          key: template.key,
        },
      }),
    ),
  );
}

export async function renderCommunicationTemplate(input: {
  body: string;
  templateKey?: string | null;
  templateVariables?: unknown;
  title: string;
}) {
  if (!input.templateKey) {
    return {
      body: input.body,
      templateVersion: null,
      title: input.title,
    };
  }

  const template = await prisma.communicationTemplate.findUnique({
    where: {
      key: input.templateKey,
    },
  });

  if (!template || !template.isActive) {
    throw new Error(`Communication template ${input.templateKey} is not active.`);
  }

  const variables = {
    body: input.body,
    title: input.title,
    ...variableMapFromJson(input.templateVariables),
  };

  return {
    body: renderString(template.bodyTemplate, variables),
    templateVersion: template.version,
    title: renderString(template.subjectTemplate, variables),
  };
}
