import { type Prisma } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

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

function toContactDto(contact: ContactRecord): ContactDto {
  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email ?? undefined,
    source: contact.source as ContactDto["source"],
    status: contact.status as ContactDto["status"],
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

  return { success: true };
};
