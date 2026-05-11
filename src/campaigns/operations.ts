import { type Prisma } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const campaignStatuses = [
  "draft",
  "queued",
  "sending",
  "sent",
  "failed",
] as const;

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
  audience: z.enum(["allContacts"]).default("allContacts"),
});

type CampaignRecord = Prisma.CampaignGetPayload<Record<string, never>>;

export type CampaignDto = {
  id: string;
  name: string;
  subtitle: string;
  message: string;
  audience: number;
  status: (typeof campaignStatuses)[number];
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  createdDate: string;
  createdAt: string;
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

function normalizeStatus(status: string): CampaignDto["status"] {
  return campaignStatuses.includes(status as CampaignDto["status"])
    ? (status as CampaignDto["status"])
    : "draft";
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
  const contacts = await prisma.contact.findMany({
    where: { organizationId: organization.id },
    select: { id: true, name: true, phone: true },
    orderBy: { updatedAt: "desc" },
  });

  const campaign = await prisma.$transaction(async (tx) => {
    const createdCampaign = await tx.campaign.create({
      data: {
        organizationId: organization.id,
        name: args.name,
        subtitle: args.subtitle || null,
        message: args.message,
        status: "draft",
        audienceFilter: { type: args.audience },
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
