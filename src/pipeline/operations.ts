import { Prisma, type Deal, type PipelineStage, type PipelineTemplate } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { getWorkspaceCurrency } from "../server/workspaceSettings";

const priorities = ["urgent", "high", "normal", "low"] as const;
const dealStatuses = ["open", "won", "lost"] as const;

const defaultPipelineTemplates = [
  {
    key: "wig",
    name: "Wig Vendor Workflow",
    stages: [
      { slug: "new_inquiry", name: "New Inquiry", color: "gray" },
      { slug: "style_confirmed", name: "Style Confirmed", color: "indigo" },
      { slug: "payment_received", name: "Payment Received", color: "amber" },
      { slug: "shipped_closed", name: "Shipped/Closed", color: "green" },
    ],
  },
  {
    key: "gadget",
    name: "Gadget Store Workflow",
    stages: [
      { slug: "inquiry", name: "Inquiry", color: "gray" },
      { slug: "spec_confirmed", name: "Spec Confirmed", color: "indigo" },
      { slug: "payment_received", name: "Payment Received", color: "amber" },
      { slug: "delivered", name: "Delivered", color: "green" },
    ],
  },
  {
    key: "standard",
    name: "Standard Sales Workflow",
    stages: [
      { slug: "discovery", name: "Discovery", color: "gray" },
      { slug: "demo_conducted", name: "Demo Conducted", color: "indigo" },
      { slug: "proposal_sent", name: "Proposal Sent", color: "amber" },
      { slug: "negotiation", name: "Negotiation", color: "green" },
      { slug: "won_closed", name: "Won/Closed", color: "red" },
    ],
  },
] as const;

const getPipelineStateArgsSchema = z
  .object({
    templateId: z.string().uuid().optional(),
  })
  .optional();

const setActivePipelineTemplateArgsSchema = z.object({
  templateId: z.string().uuid(),
});

const createDealArgsSchema = z.object({
  customerName: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  value: z.coerce.number().min(0).max(999_999_999),
  currency: z.string().trim().min(3).max(3).optional(),
  priorityLevel: z.enum(priorities).default("normal"),
  stageId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

type CreateDealArgs = z.infer<typeof createDealArgsSchema>;

const updateDealArgsSchema = createDealArgsSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(dealStatuses).optional(),
});

const updateDealStageArgsSchema = z.object({
  id: z.string().uuid(),
  stageId: z.string().uuid(),
});

const deleteDealArgsSchema = z.object({
  id: z.string().uuid(),
});

type StageWithDeals = PipelineStage & {
  deals: Deal[];
};

type TemplateRecord = PipelineTemplate & {
  stages: StageWithDeals[];
};

export type PipelineTemplateDto = {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
};

export type DealDto = {
  id: string;
  customerName: string;
  phone?: string;
  contactId?: string;
  createdAt: string;
  updatedAt: string;
  value: number;
  currency: string;
  status: string;
  priorityLevel: (typeof priorities)[number];
  agentInitials: string;
  date: string;
  lastInteractionAt?: string;
  stageId: string;
  stageSlug: string;
  stageName: string;
  isStale: boolean;
  notes?: string;
};

export type PipelineStageDto = {
  id: string;
  slug: string;
  name: string;
  color: string;
  sortOrder: number;
  value: number;
  count: number;
  deals: DealDto[];
};

export type PipelineStateDto = {
  templates: PipelineTemplateDto[];
  activeTemplate: PipelineTemplateDto;
  stages: PipelineStageDto[];
  stats: {
    totalValue: number;
    dealCount: number;
    winRate: number;
    currency: string;
  };
};

function ensureUserId(context: any) {
  if (!context.user?.id) {
    throw new HttpError(401, "Only authenticated users can access pipeline.");
  }

  return context.user.id as string;
}

async function ensureOrganizationForUser(userId: string) {
  return prisma.organization.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

function normalizePhoneNumber(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 6) {
    throw new HttpError(400, "Enter a valid WhatsApp phone number.");
  }

  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

function makeInitials(name: string) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return initials || "QR";
}

const contactAvatarColors = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#10b981,#3b82f6)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#3b82f6,#6366f1)",
  "linear-gradient(135deg,#8b5cf6,#6366f1)",
  "linear-gradient(135deg,#ec4899,#8b5cf6)",
  "linear-gradient(135deg,#f59e0b,#10b981)",
  "linear-gradient(135deg,#10b981,#0ea5e9)",
  "linear-gradient(135deg,#fe901d,#e98214)",
] as const;

function getContactAvatarColor(value: string) {
  const seed = value.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return contactAvatarColors[seed % contactAvatarColors.length];
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(value);
}

function decimalToNumber(value: Prisma.Decimal | number) {
  return Number(value);
}

function normalizePriority(priority: string): DealDto["priorityLevel"] {
  return priorities.includes(priority as DealDto["priorityLevel"])
    ? (priority as DealDto["priorityLevel"])
    : "normal";
}

function isDealStale(deal: Deal) {
  if (deal.status !== "open") {
    return false;
  }

  return Date.now() - deal.lastStageChangedAt.getTime() > 48 * 60 * 60 * 1000;
}

async function resolveContactForDeal(args: CreateDealArgs, organizationId: string) {
  const customerName = args.customerName.trim();
  const normalizedPhone = normalizePhoneNumber(args.phone);

  if (args.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: args.contactId, organizationId },
      select: { id: true, name: true, phone: true },
    });

    if (!contact) {
      throw new HttpError(404, "Contact not found.");
    }

    return {
      contactId: contact.id,
      customerName,
      phone: contact.phone,
    };
  }

  if (!normalizedPhone) {
    throw new HttpError(400, "Phone/WhatsApp is required to create a deal.");
  }

  const existingContact = await prisma.contact.findFirst({
    where: { organizationId, phone: normalizedPhone },
    select: { id: true, name: true, phone: true },
  });

  if (existingContact) {
    return {
      contactId: existingContact.id,
      customerName,
      phone: existingContact.phone,
    };
  }

  const contact = await prisma.contact.create({
    data: {
      organizationId,
      name: customerName,
      phone: normalizedPhone,
      source: "Walk-in",
      status: "new-lead",
      tags: ["Interested"],
      assignedTo: "Agent A",
      notes: args.notes || null,
      avatarColor: getContactAvatarColor(normalizedPhone),
    },
    select: { id: true, phone: true },
  });

  return {
    contactId: contact.id,
    customerName,
    phone: contact.phone,
  };
}

async function ensureDefaultTemplates(organizationId: string) {
  const existingTemplates = await prisma.pipelineTemplate.findMany({
    where: { organizationId },
    include: { stages: true },
    orderBy: { createdAt: "asc" },
  });

  const existingKeys = new Set(existingTemplates.map((template) => template.key));

  for (const [templateIndex, template] of defaultPipelineTemplates.entries()) {
    if (existingKeys.has(template.key)) {
      continue;
    }

    await prisma.pipelineTemplate.create({
      data: {
        organizationId,
        key: template.key,
        name: template.name,
        isActive: existingTemplates.length === 0 && templateIndex === 0,
        stages: {
          create: template.stages.map((stage, stageIndex) => ({
            slug: stage.slug,
            name: stage.name,
            color: stage.color,
            sortOrder: stageIndex,
          })),
        },
      },
    });
  }

  const activeTemplate = await prisma.pipelineTemplate.findFirst({
    where: { organizationId, isActive: true },
    select: { id: true },
  });

  if (!activeTemplate) {
    const firstTemplate = await prisma.pipelineTemplate.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (firstTemplate) {
      await prisma.pipelineTemplate.update({
        where: { id: firstTemplate.id },
        data: { isActive: true },
      });
    }
  }
}

async function getSelectedTemplate(organizationId: string, templateId?: string) {
  if (templateId) {
    const template = await prisma.pipelineTemplate.findFirst({
      where: { id: templateId, organizationId },
      include: {
        stages: {
          include: {
            deals: {
              where: { organizationId },
              orderBy: [{ updatedAt: "desc" }],
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!template) {
      throw new HttpError(404, "Pipeline template not found.");
    }

    return template;
  }

  const activeTemplate = await prisma.pipelineTemplate.findFirst({
    where: { organizationId, isActive: true },
    include: {
      stages: {
        include: {
          deals: {
            where: { organizationId },
            orderBy: [{ updatedAt: "desc" }],
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!activeTemplate) {
    throw new HttpError(404, "Pipeline template not found.");
  }

  return activeTemplate;
}

function toDealDto(deal: Deal, stage: PipelineStage): DealDto {
  return {
    id: deal.id,
    customerName: deal.customerName,
    phone: deal.phone ?? undefined,
    contactId: deal.contactId ?? undefined,
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
    value: decimalToNumber(deal.value),
    currency: deal.currency,
    status: deal.status,
    priorityLevel: normalizePriority(deal.priorityLevel),
    agentInitials: makeInitials(deal.customerName),
    date: formatDate(deal.lastInteractionAt ?? deal.updatedAt),
    lastInteractionAt: deal.lastInteractionAt?.toISOString(),
    stageId: stage.id,
    stageSlug: stage.slug,
    stageName: stage.name,
    isStale: isDealStale(deal),
    notes: deal.notes ?? undefined,
  };
}

function toPipelineStateDto(
  templates: PipelineTemplate[],
  activeTemplate: TemplateRecord,
  workspaceCurrency: string,
): PipelineStateDto {
  const stages = activeTemplate.stages.map((stage) => {
    const deals = stage.deals.map((deal) => toDealDto(deal, stage));
    const value = deals.reduce((sum, deal) => sum + deal.value, 0);

    return {
      id: stage.id,
      slug: stage.slug,
      name: stage.name,
      color: stage.color,
      sortOrder: stage.sortOrder,
      value,
      count: deals.length,
      deals,
    };
  });

  const allDeals = stages.flatMap((stage) => stage.deals);
  const closedDeals = allDeals.filter((deal) => deal.status === "won" || deal.status === "lost");
  const wonDeals = allDeals.filter((deal) => deal.status === "won");
  const totalValue = allDeals
    .filter((deal) => deal.status !== "lost")
    .reduce((sum, deal) => sum + deal.value, 0);

  return {
    templates: templates.map((template) => ({
      id: template.id,
      key: template.key,
      name: template.name,
      isActive: template.isActive,
    })),
    activeTemplate: {
      id: activeTemplate.id,
      key: activeTemplate.key,
      name: activeTemplate.name,
      isActive: activeTemplate.isActive,
    },
    stages,
    stats: {
      totalValue,
      dealCount: allDeals.length,
      winRate:
        closedDeals.length > 0
          ? Math.round((wonDeals.length / closedDeals.length) * 100)
          : 0,
      currency: workspaceCurrency,
    },
  };
}

async function getPipelineStateForOrganization(
  organizationId: string,
  workspaceCurrency: string,
  templateId?: string,
) {
  await ensureDefaultTemplates(organizationId);

  const [templates, selectedTemplate] = await Promise.all([
    prisma.pipelineTemplate.findMany({
      where: { organizationId },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    }),
    getSelectedTemplate(organizationId, templateId),
  ]);

  return toPipelineStateDto(templates, selectedTemplate, workspaceCurrency);
}

async function ensureStageForDeal(
  organizationId: string,
  templateId?: string,
  stageId?: string,
) {
  if (stageId) {
    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: stageId,
        template: {
          organizationId,
          ...(templateId ? { id: templateId } : {}),
        },
      },
    });

    if (!stage) {
      throw new HttpError(404, "Pipeline stage not found.");
    }

    return stage;
  }

  const template = await getSelectedTemplate(organizationId, templateId);
  const firstStage = template.stages[0];

  if (!firstStage) {
    throw new HttpError(400, "Pipeline template has no stages.");
  }

  return firstStage;
}

export const getPipelineState = async (
  rawArgs: unknown,
  context: any,
): Promise<PipelineStateDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    getPipelineStateArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);
  const workspaceCurrency = getWorkspaceCurrency(
    organization.settings,
    organization.country,
  ).code;

  return getPipelineStateForOrganization(
    organization.id,
    workspaceCurrency,
    args?.templateId,
  );
};

export const setActivePipelineTemplate = async (
  rawArgs: unknown,
  context: any,
): Promise<PipelineStateDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    setActivePipelineTemplateArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);
  const workspaceCurrency = getWorkspaceCurrency(
    organization.settings,
    organization.country,
  ).code;

  const template = await prisma.pipelineTemplate.findFirst({
    where: { id: args.templateId, organizationId: organization.id },
    select: { id: true },
  });

  if (!template) {
    throw new HttpError(404, "Pipeline template not found.");
  }

  await prisma.$transaction([
    prisma.pipelineTemplate.updateMany({
      where: { organizationId: organization.id },
      data: { isActive: false },
    }),
    prisma.pipelineTemplate.update({
      where: { id: args.templateId },
      data: { isActive: true },
    }),
  ]);

  return getPipelineStateForOrganization(
    organization.id,
    workspaceCurrency,
    args.templateId,
  );
};

export const createDeal = async (
  rawArgs: unknown,
  context: any,
): Promise<PipelineStateDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(createDealArgsSchema, rawArgs);
  const organization = await ensureOrganizationForUser(userId);
  const workspaceCurrency = getWorkspaceCurrency(
    organization.settings,
    organization.country,
  ).code;
  const stage = await ensureStageForDeal(
    organization.id,
    args.templateId,
    args.stageId,
  );
  const contact = await resolveContactForDeal(args, organization.id);

  await prisma.deal.create({
    data: {
      organizationId: organization.id,
      contactId: contact.contactId,
      templateId: stage.templateId,
      stageId: stage.id,
      customerName: contact.customerName,
      phone: contact.phone,
      value: new Prisma.Decimal(args.value),
      currency: (args.currency ?? workspaceCurrency).toUpperCase(),
      priorityLevel: args.priorityLevel,
      notes: args.notes || null,
      lastInteractionAt: new Date(),
    },
  });

  return getPipelineStateForOrganization(
    organization.id,
    workspaceCurrency,
    stage.templateId,
  );
};

export const updateDeal = async (
  rawArgs: unknown,
  context: any,
): Promise<PipelineStateDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateDealArgsSchema, rawArgs);
  const organization = await ensureOrganizationForUser(userId);
  const workspaceCurrency = getWorkspaceCurrency(
    organization.settings,
    organization.country,
  ).code;
  const existingDeal = await prisma.deal.findFirst({
    where: { id: args.id, organizationId: organization.id },
    select: { id: true, templateId: true, stageId: true },
  });

  if (!existingDeal) {
    throw new HttpError(404, "Deal not found.");
  }

  const stage = args.stageId
    ? await ensureStageForDeal(organization.id, existingDeal.templateId, args.stageId)
    : null;

  await prisma.deal.update({
    where: { id: args.id },
    data: {
      customerName: args.customerName,
      phone:
        args.phone === undefined ? undefined : normalizePhoneNumber(args.phone),
      value:
        args.value === undefined
          ? undefined
          : new Prisma.Decimal(args.value),
      currency: args.currency?.toUpperCase(),
      priorityLevel: args.priorityLevel,
      status: args.status,
      stageId: stage?.id,
      notes: args.notes === undefined ? undefined : args.notes || null,
      lastInteractionAt: new Date(),
      lastStageChangedAt: stage ? new Date() : undefined,
      wonAt:
        args.status === undefined
          ? undefined
          : args.status === "won"
            ? new Date()
            : null,
      lostAt:
        args.status === undefined
          ? undefined
          : args.status === "lost"
            ? new Date()
            : null,
    },
  });

  return getPipelineStateForOrganization(
    organization.id,
    workspaceCurrency,
    existingDeal.templateId,
  );
};

export const updateDealStage = async (
  rawArgs: unknown,
  context: any,
): Promise<PipelineStateDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    updateDealStageArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);
  const workspaceCurrency = getWorkspaceCurrency(
    organization.settings,
    organization.country,
  ).code;
  const deal = await prisma.deal.findFirst({
    where: { id: args.id, organizationId: organization.id },
    select: { id: true, templateId: true },
  });

  if (!deal) {
    throw new HttpError(404, "Deal not found.");
  }

  const stage = await ensureStageForDeal(
    organization.id,
    deal.templateId,
    args.stageId,
  );

  await prisma.deal.update({
    where: { id: deal.id },
    data: {
      stageId: stage.id,
      lastStageChangedAt: new Date(),
      lastInteractionAt: new Date(),
      status: stage.slug.includes("won") ? "won" : "open",
      wonAt: stage.slug.includes("won") ? new Date() : null,
      lostAt: null,
    },
  });

  return getPipelineStateForOrganization(
    organization.id,
    workspaceCurrency,
    deal.templateId,
  );
};

export const deleteDeal = async (
  rawArgs: unknown,
  context: any,
): Promise<PipelineStateDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(deleteDealArgsSchema, rawArgs);
  const organization = await ensureOrganizationForUser(userId);
  const workspaceCurrency = getWorkspaceCurrency(
    organization.settings,
    organization.country,
  ).code;
  const deal = await prisma.deal.findFirst({
    where: { id: args.id, organizationId: organization.id },
    select: { id: true, templateId: true },
  });

  if (!deal) {
    throw new HttpError(404, "Deal not found.");
  }

  await prisma.deal.delete({
    where: { id: deal.id },
  });

  return getPipelineStateForOrganization(
    organization.id,
    workspaceCurrency,
    deal.templateId,
  );
};
