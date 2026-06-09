import { type Prisma } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { syncNonRunningCampaignAudiencesForOrganization } from "../campaigns/operations";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { sendOrganizationWhatsAppTextMessage } from "../whatsapp/transport";

const contactStatuses = [
  "ai-active",
  "human-active",
  "needs-attention",
  "new-lead",
] as const;

const contactSources = [
  "Facebook Ad",
  "Instagram",
  "Website",
  "WhatsApp",
  "Landing Page",
  "Walk-in",
  "Other",
] as const;

const avatarColors = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#10b981,#3b82f6)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#3b82f6,#6366f1)",
  "linear-gradient(135deg,#8b5cf6,#6366f1)",
  "linear-gradient(135deg,#ec4899,#8b5cf6)",
  "linear-gradient(135deg,#f59e0b,#10b981)",
  "linear-gradient(135deg,#10b981,#0ea5e9)",
  "linear-gradient(135deg,#fe901d,#e98214)",
];

const listContactsArgsSchema = z
  .object({
    search: z.string().trim().optional(),
    status: z.enum(contactStatuses).or(z.literal("all")).optional(),
    source: z.enum(contactSources).or(z.literal("all")).optional(),
    tag: z.string().trim().optional(),
    assignedTo: z.string().trim().optional(),
  })
  .optional();

const contactInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().max(240).optional().or(z.literal("")),
  source: z.enum(contactSources).default("WhatsApp"),
  status: z.enum(contactStatuses).default("new-lead"),
  tags: z.array(z.string().trim().min(1).max(40)).default(["Interested"]),
  assignedTo: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

const createContactArgsSchema = contactInputSchema;

const updateContactArgsSchema = contactInputSchema.extend({
  id: z.string().uuid(),
});

const deleteContactArgsSchema = z.object({
  id: z.string().uuid(),
});

const deleteManyContactsArgsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

const sendContactWhatsAppMessageArgsSchema = z.object({
  contactId: z.string().uuid(),
  message: z.string().trim().min(1).max(1000),
});

type ContactRecord = Prisma.ContactGetPayload<Record<string, never>>;

export type ContactDto = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source: (typeof contactSources)[number];
  status: (typeof contactStatuses)[number];
  tags: string[];
  lastMsg: string;
  lastMsgTime: string;
  assignedTo: string;
  avi: string;
  color: string;
  notes?: string;
};

function ensureUserId(context: any) {
  if (!context.user?.id) {
    throw new HttpError(401, "Only authenticated users can access contacts.");
  }

  return context.user.id as string;
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) {
    throw new HttpError(400, "Enter a valid WhatsApp phone number.");
  }

  return value.trim().startsWith("+") ? `+${digits}` : digits;
}

function makeInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function getFallbackColor(idOrPhone: string) {
  const index =
    idOrPhone.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    avatarColors.length;
  return avatarColors[index];
}

function formatRelativeTime(value: Date | null) {
  if (!value) {
    return "No activity";
  }

  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function normalizeContactTags(tags: string[]) {
  const normalizedTags = Array.from(
    new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
  );
  return normalizedTags.length > 0 ? normalizedTags : ["Interested"];
}

function normalizeContactSourceFromDb(
  value: string | null | undefined,
): ContactDto["source"] {
  if (!value) {
    return "WhatsApp";
  }

  return (
    contactSources.find(
      (source) => source.toLowerCase() === value.trim().toLowerCase(),
    ) ?? "Other"
  );
}

function normalizeContactStatusFromDb(
  value: string | null | undefined,
): ContactDto["status"] {
  const normalized = value?.trim().toLowerCase();

  switch (normalized) {
    case "ai-active":
    case "active":
      return "ai-active";
    case "human-active":
    case "qualified":
      return "human-active";
    case "needs-attention":
    case "cold":
      return "needs-attention";
    case "new-lead":
    default:
      return "new-lead";
  }
}

function toContactDto(contact: ContactRecord): ContactDto {
  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email ?? undefined,
    source: normalizeContactSourceFromDb(contact.source),
    status: normalizeContactStatusFromDb(contact.status),
    tags: normalizeContactTags(contact.tags) as ContactDto["tags"],
    lastMsg: contact.lastMessage ?? "No messages yet",
    lastMsgTime: formatRelativeTime(contact.lastMessageAt),
    assignedTo: contact.assignedTo ?? "Unassigned",
    avi: makeInitials(contact.name),
    color: contact.avatarColor ?? getFallbackColor(contact.id),
    notes: contact.notes ?? undefined,
  };
}

async function ensureOrganizationForUser(userId: string) {
  return prisma.organization.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export const getContacts = async (
  rawArgs: unknown,
  context: any,
): Promise<ContactDto[]> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    listContactsArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);
  const search = args?.search?.trim();

  const where: Prisma.ContactWhereInput = {
    organizationId: organization.id,
    status: args?.status && args.status !== "all" ? args.status : undefined,
    source: args?.source && args.source !== "all" ? args.source : undefined,
    tags: args?.tag && args.tag !== "all" ? { has: args.tag } : undefined,
    assignedTo: args?.assignedTo?.trim() || undefined,
    OR: search
      ? [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
  };

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
  });

  return contacts.map(toContactDto);
};

const getContactArgsSchema = z.object({
  id: z.string().uuid(),
});

export const getContact = async (
  rawArgs: unknown,
  context: any,
): Promise<ContactDto | null> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    getContactArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);

  const contact = await prisma.contact.findUnique({
    where: {
      id: args.id,
      organizationId: organization.id,
    },
  });

  return contact ? toContactDto(contact) : null;
};

export const createContact = async (
  rawArgs: unknown,
  context: any,
): Promise<ContactDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    createContactArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);
  const phone = normalizePhoneNumber(args.phone);

  try {
    const contact = await prisma.contact.create({
      data: {
        organizationId: organization.id,
        name: args.name,
        phone,
        email: args.email || null,
        source: args.source,
        status: args.status,
        tags: normalizeContactTags(args.tags),
        assignedTo: args.assignedTo || null,
        notes: args.notes || null,
        avatarColor: getFallbackColor(phone),
      },
    });

    return toContactDto(contact);
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new HttpError(
        409,
        "A contact with this phone number already exists.",
      );
    }

    throw error;
  }
};

export const updateContact = async (
  rawArgs: unknown,
  context: any,
): Promise<ContactDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    updateContactArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);
  const phone = normalizePhoneNumber(args.phone);

  try {
    const contact = await prisma.contact.update({
      where: {
        id: args.id,
        organizationId: organization.id,
      },
      data: {
        name: args.name,
        phone,
        email: args.email || null,
        source: args.source,
        status: args.status,
        tags: normalizeContactTags(args.tags),
        assignedTo: args.assignedTo || null,
        notes: args.notes || null,
      },
    });

    return toContactDto(contact);
  } catch (error: any) {
    if (error?.code === "P2025") {
      throw new HttpError(404, "Contact not found.");
    }

    if (error?.code === "P2002") {
      throw new HttpError(
        409,
        "A contact with this phone number already exists.",
      );
    }

    throw error;
  }
};

export const deleteContact = async (
  rawArgs: unknown,
  context: any,
): Promise<{ success: true }> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    deleteContactArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);

  await prisma.contact.delete({
    where: {
      id: args.id,
      organizationId: organization.id,
    },
  });

  await syncNonRunningCampaignAudiencesForOrganization(organization.id);

  return { success: true };
};

export const deleteManyContacts = async (
  rawArgs: unknown,
  context: any,
): Promise<{ deletedIds: string[] }> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    deleteManyContactsArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);

  const deletableContacts = await prisma.contact.findMany({
    where: {
      id: { in: args.ids },
      organizationId: organization.id,
    },
    select: { id: true },
  });

  const deletableIds = deletableContacts.map((contact) => contact.id);
  if (deletableIds.length === 0) {
    return { deletedIds: [] };
  }

  await prisma.contact.deleteMany({
    where: {
      id: { in: deletableIds },
      organizationId: organization.id,
    },
  });

  await syncNonRunningCampaignAudiencesForOrganization(organization.id);

  return { deletedIds: deletableIds };
};

function getErrorMessage(error: unknown) {
  const record =
    error && typeof error === "object"
      ? (error as {
          provider?: string;
          providerMessage?: unknown;
          providerStatus?: unknown;
          evolutionStatus?: unknown;
        })
      : null;

  if (
    record?.provider === "evolution" &&
    (record.providerStatus === 500 || record.evolutionStatus === 500)
  ) {
    return "Evolution API rejected the send request. Check that the QR session is still connected and the recipient number includes the country code.";
  }

  if (typeof record?.providerMessage === "string" && record.providerMessage) {
    return record.providerMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not send WhatsApp message.";
}

export const sendContactWhatsAppMessage = async (
  rawArgs: unknown,
  context: any,
): Promise<{ success: true }> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    sendContactWhatsAppMessageArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);
  const contact = await prisma.contact.findFirst({
    where: {
      id: args.contactId,
      organizationId: organization.id,
    },
  });

  if (!contact) {
    throw new HttpError(404, "Contact not found.");
  }

  try {
    const send = await sendOrganizationWhatsAppTextMessage({
      organization,
      phoneNumber: contact.phone,
      message: args.message,
    });

    await prisma.$transaction([
      prisma.whatsAppMessageLog.create({
        data: {
          organizationId: organization.id,
          instanceName: send.instanceName,
          direction: "outbound",
          to: contact.phone,
          pushName: contact.name,
          messageType: "conversation",
          text: args.message,
          status: send.result.status ?? "SENT",
          source: "app",
          providerEvent: "contact_message",
          providerMessageId: send.result.providerMessageId,
          rawPayload: {
            provider: send.provider,
            phoneNumberId: send.phoneNumberId,
            providerResponse: send.result.rawResponse,
          } as any,
        },
      }),
      prisma.contact.update({
        where: { id: contact.id },
        data: {
          lastMessage: args.message,
          lastMessageAt: new Date(),
          lastMessageDirection: "outbound",
        },
      }),
    ]);
  } catch (error) {
    console.error("Could not send contact WhatsApp message", error);
    throw new HttpError(
      502,
      `Could not send WhatsApp message. ${getErrorMessage(error)}`,
    );
  }

  return { success: true };
};
