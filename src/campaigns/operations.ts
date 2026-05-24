import { type Prisma } from "@prisma/client";
import { HttpError, env, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const campaignStatuses = [
  "draft",
  "queued",
  "sending",
  "sent",
  "failed",
] as const;

const campaignAudienceModes = [
  "allContacts",
  "tags",
  "pipelineStages",
  "manual",
] as const;

const campaignAudienceFilterSchema = z.object({
  mode: z.enum(campaignAudienceModes).default("allContacts"),
  tags: z.array(z.string().trim().min(1).max(40)).default([]),
  stageIds: z.array(z.string().uuid()).default([]),
  contactIds: z.array(z.string().uuid()).default([]),
});

const listCampaignsArgsSchema = z
  .object({
    search: z.string().trim().optional(),
    status: z.enum(campaignStatuses).or(z.literal("all")).optional(),
  })
  .optional();

const createCampaignArgsSchema = z.object({
  name: z.string().trim().min(1).max(160),
  subtitle: z.string().trim().max(240).optional().or(z.literal("")),
  message: z.string().trim().min(1).max(2000),
  mediaUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  mediaType: z.string().trim().max(80).optional().or(z.literal("")),
  useApprovedTemplate: z.boolean().default(false),
  templateName: z.string().trim().max(160).optional().or(z.literal("")),
  templateLanguage: z.string().trim().max(40).optional().or(z.literal("")),
  enableJenniferReplies: z.boolean().default(false),
  campaignContext: z.string().trim().max(2000).optional().or(z.literal("")),
  audience: campaignAudienceFilterSchema,
});

const estimateCampaignAudienceArgsSchema = z.object({
  audience: campaignAudienceFilterSchema,
});

const getCampaignPreviewArgsSchema = z.object({
  message: z.string().trim().max(2000),
  audience: campaignAudienceFilterSchema,
});

const getCampaignDetailArgsSchema = z.object({
  campaignId: z.string().uuid(),
});

const launchCampaignArgsSchema = z.object({
  campaignId: z.string().uuid(),
});

type CampaignAudienceFilter = z.infer<typeof campaignAudienceFilterSchema>;

type CampaignRecord = Prisma.CampaignGetPayload<Record<string, never>>;
type AudienceContactRecord = {
  id: string;
  name: string;
  phone: string;
};

export type CampaignDto = {
  id: string;
  name: string;
  subtitle: string;
  message: string;
  mediaUrl: string | null;
  mediaType: string | null;
  useApprovedTemplate: boolean;
  templateName: string | null;
  templateLanguage: string | null;
  enableJenniferReplies: boolean;
  campaignContext: string | null;
  audience: number;
  status: (typeof campaignStatuses)[number];
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  createdDate: string;
  createdAt: string;
};

export type CampaignAudienceEstimateDto = {
  count: number;
  contactIds: string[];
};

export type CampaignPreviewDto = {
  renderedMessage: string;
  sampleContactName: string | null;
  sampleContactPhone: string | null;
  sampleLastAction: string | null;
};

export type CampaignLaunchPayload = {
  organizationId: string;
  campaignId: string;
  name: string;
  subtitle: string | null;
  message: string;
  mediaUrl: string | null;
  mediaType: string | null;
  useApprovedTemplate: boolean;
  templateName: string | null;
  templateLanguage: string | null;
  enableJenniferReplies: boolean;
  campaignContext: string | null;
  audienceCount: number;
  recipients: Array<{
    campaignRecipientId: string;
    contactId: string | null;
    name: string | null;
    phone: string;
    status: string;
  }>;
};

export type CampaignStatusWebhookPayload = {
  campaignId: string;
  status?: (typeof campaignStatuses)[number];
  sentCount?: number;
  deliveredCount?: number;
  failedCount?: number;
  sentAt?: string;
  failureReason?: string | null;
  recipients: Array<{
    campaignRecipientId?: string;
    phone?: string;
    status?: string;
    providerMessageId?: string | null;
    lastError?: string | null;
    sentAt?: string;
    deliveredAt?: string;
  }>;
};

type CampaignLaunchResultDto = {
  campaign: CampaignDto;
  handoff: {
    attempted: boolean;
    delivered: boolean;
    reason: string;
  };
};

export type CampaignEventDto = {
  id: string;
  eventType: string;
  createdAt: string;
  summary: string;
  payloadPreview: string | null;
};

export type CampaignDetailDto = CampaignDto & {
  recipientCount: number;
  queuedRecipients: number;
  deliveredRecipients: number;
  failedRecipients: number;
  latestEventType: string | null;
  events: CampaignEventDto[];
};

function ensureUserId(context: any) {
  if (!context.user?.id) {
    throw new HttpError(401, "Only authenticated users can access campaigns.");
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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function normalizeStatus(status: string): CampaignDto["status"] {
  return campaignStatuses.includes(status as CampaignDto["status"])
    ? (status as CampaignDto["status"])
    : "draft";
}

function normalizeAudienceFilter(
  audience: CampaignAudienceFilter,
): CampaignAudienceFilter {
  return {
    mode: audience.mode,
    tags: Array.from(new Set(audience.tags.map((tag) => tag.trim()).filter(Boolean))),
    stageIds: Array.from(new Set(audience.stageIds.filter(Boolean))),
    contactIds: Array.from(new Set(audience.contactIds.filter(Boolean))),
  };
}

function getFirstName(name: string | null | undefined) {
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName || "there";
}

function buildLastAction(input: {
  lastMessage: string | null;
  stageName?: string | null;
}) {
  const lastMessage = input.lastMessage?.trim();
  if (lastMessage) {
    return lastMessage;
  }

  if (input.stageName?.trim()) {
    return `currently in ${input.stageName}`;
  }

  return "your recent inquiry";
}

function renderCampaignMessage(
  message: string,
  variables: {
    firstName: string;
    lastAction: string;
  },
) {
  return message
    .replace(/\{\{\s*first_name\s*\}\}/gi, variables.firstName)
    .replace(/\{\{\s*last_action\s*\}\}/gi, variables.lastAction);
}

function ensureCampaignCanLaunch(campaign: CampaignRecord) {
  if (campaign.status !== "draft" && campaign.status !== "failed") {
    throw new HttpError(
      400,
      "Only draft or failed campaigns can be queued for launch.",
    );
  }

  if (!campaign.name.trim() || !campaign.message.trim()) {
    throw new HttpError(400, "Campaign name and message are required.");
  }

  if (campaign.audienceCount <= 0) {
    throw new HttpError(
      400,
      "Campaign must have at least one recipient before launch.",
    );
  }

  if (
    campaign.useApprovedTemplate &&
    (!campaign.templateName?.trim() || !campaign.templateLanguage?.trim())
  ) {
    throw new HttpError(
      400,
      "Template name and language are required when approved template mode is enabled.",
    );
  }
}

function buildCampaignLaunchPayload(input: {
  organizationId: string;
  campaign: CampaignRecord;
  recipients: Array<{
    id: string;
    contactId: string | null;
    name: string | null;
    phone: string;
    status: string;
  }>;
}): CampaignLaunchPayload {
  return {
    organizationId: input.organizationId,
    campaignId: input.campaign.id,
    name: input.campaign.name,
    subtitle: input.campaign.subtitle ?? null,
    message: input.campaign.message,
    mediaUrl: input.campaign.mediaUrl ?? null,
    mediaType: input.campaign.mediaType ?? null,
    useApprovedTemplate: input.campaign.useApprovedTemplate,
    templateName: input.campaign.templateName ?? null,
    templateLanguage: input.campaign.templateLanguage ?? null,
    enableJenniferReplies: input.campaign.enableJenniferReplies,
    campaignContext: input.campaign.campaignContext ?? null,
    audienceCount: input.campaign.audienceCount,
    recipients: input.recipients.map((recipient) => ({
      campaignRecipientId: recipient.id,
      contactId: recipient.contactId,
      name: recipient.name,
      phone: recipient.phone,
      status: recipient.status,
    })),
  };
}

function summarizeCampaignEvent(eventType: string) {
  switch (eventType) {
    case "launch_queued":
      return "Campaign queued locally";
    case "launch_waiting_for_n8n_config":
      return "Waiting for n8n campaign webhook configuration";
    case "n8n_handoff_delivered":
      return "Launch payload delivered to n8n";
    case "n8n_handoff_failed":
      return "n8n handoff failed";
    case "n8n_status_update":
      return "n8n pushed a campaign status update";
    case "n8n_status_failure_reason":
      return "n8n reported a failure reason";
    default:
      return eventType.replace(/_/g, " ");
  }
}

function buildPayloadPreview(rawPayload: unknown): string | null {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return null;
  }

  const payload = rawPayload as Record<string, unknown>;
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim().slice(0, 140);
  }

  if (typeof payload.reason === "string" && payload.reason.trim()) {
    return payload.reason.trim().slice(0, 140);
  }

  if (typeof payload.failureReason === "string" && payload.failureReason.trim()) {
    return payload.failureReason.trim().slice(0, 140);
  }

  if (
    payload.payload &&
    typeof payload.payload === "object" &&
    !Array.isArray(payload.payload)
  ) {
    const nested = payload.payload as Record<string, unknown>;
    if (typeof nested.message === "string" && nested.message.trim()) {
      return nested.message.trim().slice(0, 140);
    }
  }

  return null;
}

async function postCampaignLaunchToN8n(payload: CampaignLaunchPayload) {
  const inboundUrl = env.N8N_CAMPAIGN_WEBHOOK_URL;
  if (!inboundUrl) {
    return {
      attempted: false,
      delivered: false,
      reason: "campaign_webhook_not_configured",
    } as const;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-quicreply-event": "campaign.launch_queued",
  };

  if (env.N8N_CAMPAIGN_WEBHOOK_SECRET) {
    headers["x-quicreply-webhook-secret"] = env.N8N_CAMPAIGN_WEBHOOK_SECRET;
  }

  const response = await fetch(inboundUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new HttpError(502, "Could not forward campaign launch to n8n.");
  }

  return {
    attempted: true,
    delivered: true,
    reason: "n8n_handoff_delivered",
  } as const;
}

async function resolveAudienceContacts(
  organizationId: string,
  audience: CampaignAudienceFilter,
): Promise<AudienceContactRecord[]> {
  const normalizedAudience = normalizeAudienceFilter(audience);
  const baseSelect = {
    id: true,
    name: true,
    phone: true,
  } as const;

  switch (normalizedAudience.mode) {
    case "allContacts":
      return prisma.contact.findMany({
        where: { organizationId },
        select: baseSelect,
        orderBy: [{ updatedAt: "desc" }],
      });

    case "tags":
      if (normalizedAudience.tags.length === 0) {
        return [];
      }

      return prisma.contact.findMany({
        where: {
          organizationId,
          tags: { hasSome: normalizedAudience.tags },
        },
        select: baseSelect,
        orderBy: [{ updatedAt: "desc" }],
      });

    case "pipelineStages": {
      if (normalizedAudience.stageIds.length === 0) {
        return [];
      }

      const deals = await prisma.deal.findMany({
        where: {
          organizationId,
          stageId: { in: normalizedAudience.stageIds },
          contactId: { not: null },
        },
        select: {
          contactId: true,
        },
      });

      const contactIds = Array.from(
        new Set(
          deals
            .map((deal) => deal.contactId)
            .filter((contactId): contactId is string => Boolean(contactId)),
        ),
      );

      if (contactIds.length === 0) {
        return [];
      }

      return prisma.contact.findMany({
        where: {
          organizationId,
          id: { in: contactIds },
        },
        select: baseSelect,
        orderBy: [{ updatedAt: "desc" }],
      });
    }

    case "manual":
      if (normalizedAudience.contactIds.length === 0) {
        return [];
      }

      return prisma.contact.findMany({
        where: {
          organizationId,
          id: { in: normalizedAudience.contactIds },
        },
        select: baseSelect,
        orderBy: [{ updatedAt: "desc" }],
      });
  }
}

async function getCampaignPreviewForAudience(
  organizationId: string,
  message: string,
  audience: CampaignAudienceFilter,
): Promise<CampaignPreviewDto> {
  const contacts = await resolveAudienceContacts(organizationId, audience);
  const sampleContact = contacts[0];

  if (!sampleContact) {
    return {
      renderedMessage: message,
      sampleContactName: null,
      sampleContactPhone: null,
      sampleLastAction: null,
    };
  }

  const [contact, latestDeal] = await Promise.all([
    prisma.contact.findFirst({
      where: { id: sampleContact.id, organizationId },
      select: {
        id: true,
        name: true,
        phone: true,
        lastMessage: true,
      },
    }),
    prisma.deal.findFirst({
      where: {
        organizationId,
        contactId: sampleContact.id,
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        stage: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const sampleLastAction = buildLastAction({
    lastMessage: contact?.lastMessage ?? null,
    stageName: latestDeal?.stage.name ?? null,
  });

  return {
    renderedMessage: renderCampaignMessage(message, {
      firstName: getFirstName(contact?.name),
      lastAction: sampleLastAction,
    }),
    sampleContactName: contact?.name ?? null,
    sampleContactPhone: contact?.phone ?? null,
    sampleLastAction,
  };
}

function toCampaignDto(campaign: CampaignRecord): CampaignDto {
  const deliveryRate =
    campaign.sentCount > 0
      ? Math.round((campaign.deliveredCount / campaign.sentCount) * 1000) / 10
      : 0;

  return {
    id: campaign.id,
    name: campaign.name,
    subtitle: campaign.subtitle ?? "Broadcast draft",
    message: campaign.message,
    mediaUrl: campaign.mediaUrl ?? null,
    mediaType: campaign.mediaType ?? null,
    useApprovedTemplate: campaign.useApprovedTemplate,
    templateName: campaign.templateName ?? null,
    templateLanguage: campaign.templateLanguage ?? null,
    enableJenniferReplies: campaign.enableJenniferReplies,
    campaignContext: campaign.campaignContext ?? null,
    audience: campaign.audienceCount,
    status: normalizeStatus(campaign.status),
    sent: campaign.sentCount,
    delivered: campaign.deliveredCount,
    failed: campaign.failedCount,
    deliveryRate,
    createdDate: formatDate(campaign.createdAt),
    createdAt: campaign.createdAt.toISOString(),
  };
}

export const getCampaigns = async (
  rawArgs: unknown,
  context: any,
): Promise<CampaignDto[]> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    listCampaignsArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);
  const search = args?.search?.trim();

  const where: Prisma.CampaignWhereInput = {
    organizationId: organization.id,
    status: args?.status && args.status !== "all" ? args.status : undefined,
    OR: search
      ? [
          { name: { contains: search, mode: "insensitive" } },
          { subtitle: { contains: search, mode: "insensitive" } },
          { message: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
  };

  const campaigns = await prisma.campaign.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
  });

  return campaigns.map(toCampaignDto);
};

export const estimateCampaignAudience = async (
  rawArgs: unknown,
  context: any,
): Promise<CampaignAudienceEstimateDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    estimateCampaignAudienceArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);
  const contacts = await resolveAudienceContacts(organization.id, args.audience);

  return {
    count: contacts.length,
    contactIds: contacts.map((contact) => contact.id),
  };
};

export const getCampaignPreview = async (
  rawArgs: unknown,
  context: any,
): Promise<CampaignPreviewDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    getCampaignPreviewArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);

  return getCampaignPreviewForAudience(
    organization.id,
    args.message,
    args.audience,
  );
};

export const getCampaignDetail = async (
  rawArgs: unknown,
  context: any,
): Promise<CampaignDetailDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    getCampaignDetailArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: args.campaignId,
      organizationId: organization.id,
    },
    include: {
      recipients: {
        select: {
          status: true,
        },
      },
      events: {
        orderBy: [{ createdAt: "desc" }],
        take: 12,
        select: {
          id: true,
          eventType: true,
          createdAt: true,
          rawPayload: true,
        },
      },
    },
  });

  if (!campaign) {
    throw new HttpError(404, "Campaign not found.");
  }

  const base = toCampaignDto(campaign);
  const queuedRecipients = campaign.recipients.filter(
    (recipient) => recipient.status === "queued",
  ).length;
  const deliveredRecipients = campaign.recipients.filter(
    (recipient) => recipient.status === "delivered",
  ).length;
  const failedRecipients = campaign.recipients.filter(
    (recipient) => recipient.status === "failed",
  ).length;

  return {
    ...base,
    recipientCount: campaign.recipients.length,
    queuedRecipients,
    deliveredRecipients,
    failedRecipients,
    latestEventType: campaign.events[0]?.eventType ?? null,
    events: campaign.events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      createdAt: formatDateTime(event.createdAt),
      summary: summarizeCampaignEvent(event.eventType),
      payloadPreview: buildPayloadPreview(event.rawPayload),
    })),
  };
};

export const createCampaign = async (
  rawArgs: unknown,
  context: any,
): Promise<CampaignDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    createCampaignArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);

  if (args.useApprovedTemplate) {
    if (!args.templateName?.trim() || !args.templateLanguage?.trim()) {
      throw new HttpError(
        400,
        "Template name and language are required when approved template mode is enabled.",
      );
    }
  }

  const audience = normalizeAudienceFilter(args.audience);
  const contacts = await resolveAudienceContacts(organization.id, audience);

  const campaign = await prisma.$transaction(async (tx) => {
    const createdCampaign = await tx.campaign.create({
      data: {
        organizationId: organization.id,
        name: args.name,
        subtitle: args.subtitle || null,
        message: args.message,
        mediaUrl: args.mediaUrl || null,
        mediaType: args.mediaType || null,
        useApprovedTemplate: args.useApprovedTemplate,
        templateName: args.templateName || null,
        templateLanguage: args.templateLanguage || null,
        enableJenniferReplies: args.enableJenniferReplies,
        campaignContext: args.campaignContext || null,
        status: "draft",
        audienceFilter: audience,
        audienceCount: contacts.length,
      },
    });

    if (contacts.length > 0) {
      await tx.campaignRecipient.createMany({
        data: contacts.map((contact) => ({
          campaignId: createdCampaign.id,
          contactId: contact.id,
          phone: contact.phone,
          name: contact.name,
          status: "queued",
        })),
        skipDuplicates: true,
      });
    }

    return createdCampaign;
  });

  return toCampaignDto(campaign);
};

export const launchCampaign = async (
  rawArgs: unknown,
  context: any,
): Promise<CampaignLaunchResultDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    launchCampaignArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: args.campaignId,
      organizationId: organization.id,
    },
  });

  if (!campaign) {
    throw new HttpError(404, "Campaign not found.");
  }

  ensureCampaignCanLaunch(campaign);

  const recipients = await prisma.campaignRecipient.findMany({
    where: {
      campaignId: campaign.id,
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      contactId: true,
      name: true,
      phone: true,
      status: true,
    },
  });

  if (recipients.length === 0) {
    throw new HttpError(
      400,
      "Campaign must have at least one queued recipient before launch.",
    );
  }

  const payload = buildCampaignLaunchPayload({
    organizationId: organization.id,
    campaign,
    recipients,
  });

  const queuedCampaign = await prisma.$transaction(async (tx) => {
    await tx.campaignRecipient.updateMany({
      where: {
        campaignId: campaign.id,
      },
      data: {
        status: "queued",
        lastError: null,
      },
    });

    const updatedCampaign = await tx.campaign.update({
      where: { id: campaign.id },
      data: {
        status: "queued",
      },
    });

    await tx.campaignMessageEvent.create({
      data: {
        campaignId: campaign.id,
        eventType: "launch_queued",
        rawPayload: payload,
      },
    });

    return updatedCampaign;
  });

  try {
    const handoff = await postCampaignLaunchToN8n(payload);

    if (!handoff.attempted) {
      await prisma.campaignMessageEvent.create({
        data: {
          campaignId: campaign.id,
          eventType: "launch_waiting_for_n8n_config",
          rawPayload: payload,
        },
      });
    } else {
      await prisma.campaignMessageEvent.create({
        data: {
          campaignId: campaign.id,
          eventType: "n8n_handoff_delivered",
          rawPayload: payload,
        },
      });
    }

    return {
      campaign: toCampaignDto(queuedCampaign),
      handoff,
    };
  } catch (error: any) {
    const failedCampaign = await prisma.$transaction(async (tx) => {
      const updatedCampaign = await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          status: "failed",
        },
      });

      await tx.campaignMessageEvent.create({
        data: {
          campaignId: campaign.id,
          eventType: "n8n_handoff_failed",
          rawPayload: {
            payload,
            message: error?.message || "Could not forward campaign launch to n8n.",
          },
        },
      });

      return updatedCampaign;
    });

    return {
      campaign: toCampaignDto(failedCampaign),
      handoff: {
        attempted: true,
        delivered: false,
        reason: error?.message || "n8n_handoff_failed",
      },
    };
  }
};
