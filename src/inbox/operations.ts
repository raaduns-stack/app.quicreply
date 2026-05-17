import { type Prisma } from "@prisma/client";
import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { sendWhatsAppTextMessage } from "../whatsapp/provider";

const inboxThreadsArgsSchema = z
  .object({
    search: z.string().trim().optional(),
    filter: z.enum(["all", "unread", "ai", "open", "resolved"]).optional(),
  })
  .optional();

const contactIdArgsSchema = z.object({
  contactId: z.string().uuid(),
});

const sendInboxMessageArgsSchema = contactIdArgsSchema.extend({
  message: z.string().trim().min(1).max(1000),
});

const toggleThreadAiArgsSchema = contactIdArgsSchema.extend({
  isAiActive: z.boolean(),
});

type ContactRecord = Prisma.ContactGetPayload<Record<string, never>>;
type MessageLogRecord = Prisma.WhatsAppMessageLogGetPayload<Record<string, never>>;

export type InboxThreadDto = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  status: string;
  tags: string[];
  assignedTo: string | null;
  notes: string | null;
  preview: string;
  timestamp: string;
  lastMessageAt: string | null;
  unreadCount: number;
  isAiActive: boolean;
  isResolved: boolean;
  color: string;
  initials: string;
};

export type InboxMessageDto = {
  id: string;
  direction: "inbound" | "outbound";
  text: string;
  timestamp: string;
  createdAt: string;
  source: string | null;
  status: string | null;
};

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

function ensureUserId(context: any) {
  if (!context.user?.id) {
    throw new HttpError(401, "Only authenticated users can access the inbox.");
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

function getFallbackColor(idOrPhone: string) {
  const index =
    idOrPhone.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    avatarColors.length;
  return avatarColors[index];
}

function makeInitials(name: string) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return initials || "?";
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
    return `${diffMinutes}m`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d`;
  }

  return value.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function toThreadDto(contact: ContactRecord): InboxThreadDto {
  return {
    id: contact.id,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    source: contact.source,
    status: contact.status,
    tags: contact.tags,
    assignedTo: contact.assignedTo,
    notes: contact.notes,
    preview: contact.lastMessage ?? "No messages yet",
    timestamp: formatRelativeTime(contact.lastMessageAt),
    lastMessageAt: contact.lastMessageAt?.toISOString() ?? null,
    unreadCount: contact.unreadCount,
    isAiActive: contact.isAiActive,
    isResolved: Boolean(contact.resolvedAt),
    color: contact.avatarColor ?? getFallbackColor(contact.id),
    initials: makeInitials(contact.name),
  };
}

function toMessageDto(log: MessageLogRecord): InboxMessageDto {
  return {
    id: log.id,
    direction: log.direction === "outbound" ? "outbound" : "inbound",
    text: log.text ?? "Unsupported message type",
    timestamp: formatRelativeTime(log.createdAt),
    createdAt: log.createdAt.toISOString(),
    source: log.source,
    status: log.status,
  };
}

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function buildPhoneMatches(phone: string) {
  const digits = normalizePhoneDigits(phone);
  const matches = new Set<string>([phone, digits]);

  if (digits) {
    matches.add(`+${digits}`);
    matches.add(`${digits}@s.whatsapp.net`);
    matches.add(`${digits}@c.us`);
  }

  return Array.from(matches).filter(Boolean);
}

function getConnectedInstanceName(organization: {
  qrConnected: boolean;
  qrStatus: string | null;
  qrSessionId: string | null;
  evolutionInstanceName: string | null;
}) {
  if (!organization.qrConnected && organization.qrStatus !== "connected") {
    return null;
  }

  return organization.qrSessionId ?? organization.evolutionInstanceName ?? null;
}

export const getInboxThreads = async (
  rawArgs: unknown,
  context: any,
): Promise<InboxThreadDto[]> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(inboxThreadsArgsSchema, rawArgs);
  const organization = await ensureOrganizationForUser(userId);
  const search = args?.search?.trim();
  const filter = args?.filter ?? "all";

  const where: Prisma.ContactWhereInput = {
    organizationId: organization.id,
    lastMessageAt: filter === "open" ? { not: null } : undefined,
    unreadCount: filter === "unread" ? { gt: 0 } : undefined,
    isAiActive: filter === "ai" ? true : undefined,
    resolvedAt:
      filter === "resolved"
        ? { not: null }
        : filter === "open"
          ? null
          : undefined,
    OR: search
      ? [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { lastMessage: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
  };

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });

  return contacts.map(toThreadDto);
};

async function getTenantContact(contactId: string, userId: string) {
  const organization = await ensureOrganizationForUser(userId);
  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      organizationId: organization.id,
    },
  });

  if (!contact) {
    throw new HttpError(404, "Contact not found.");
  }

  return { organization, contact };
}

export const getInboxThreadMessages = async (
  rawArgs: unknown,
  context: any,
): Promise<InboxMessageDto[]> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(contactIdArgsSchema, rawArgs);
  const { organization, contact } = await getTenantContact(args.contactId, userId);
  const phoneMatches = buildPhoneMatches(contact.phone);

  const logs = await prisma.whatsAppMessageLog.findMany({
    where: {
      organizationId: organization.id,
      OR: [
        { from: { in: phoneMatches } },
        { to: { in: phoneMatches } },
        { from: { contains: normalizePhoneDigits(contact.phone) } },
        { to: { contains: normalizePhoneDigits(contact.phone) } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return logs.map(toMessageDto);
};

export const markInboxThreadRead = async (
  rawArgs: unknown,
  context: any,
): Promise<InboxThreadDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(contactIdArgsSchema, rawArgs);
  const { contact } = await getTenantContact(args.contactId, userId);

  const updatedContact = await prisma.contact.update({
    where: { id: contact.id },
    data: {
      unreadCount: 0,
      lastReadAt: new Date(),
    },
  });

  return toThreadDto(updatedContact);
};

export const toggleInboxThreadAi = async (
  rawArgs: unknown,
  context: any,
): Promise<InboxThreadDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(toggleThreadAiArgsSchema, rawArgs);
  const { contact } = await getTenantContact(args.contactId, userId);

  const updatedContact = await prisma.contact.update({
    where: { id: contact.id },
    data: {
      isAiActive: args.isAiActive,
      status: args.isAiActive ? "ai-active" : "human-active",
    },
  });

  return toThreadDto(updatedContact);
};

export const resolveInboxThread = async (
  rawArgs: unknown,
  context: any,
): Promise<InboxThreadDto> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(contactIdArgsSchema, rawArgs);
  const { contact } = await getTenantContact(args.contactId, userId);

  const updatedContact = await prisma.contact.update({
    where: { id: contact.id },
    data: {
      resolvedAt: contact.resolvedAt ? null : new Date(),
      unreadCount: 0,
      lastReadAt: new Date(),
    },
  });

  return toThreadDto(updatedContact);
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not send WhatsApp message.";
}

export const sendInboxMessage = async (
  rawArgs: unknown,
  context: any,
): Promise<{ success: true; message: InboxMessageDto }> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(sendInboxMessageArgsSchema, rawArgs);
  const { organization, contact } = await getTenantContact(args.contactId, userId);
  const instanceName = getConnectedInstanceName(organization);

  if (!instanceName) {
    throw new HttpError(400, "Connect WhatsApp QR before sending messages.");
  }

  try {
    const result = await sendWhatsAppTextMessage({
      instanceName,
      phoneNumber: contact.phone,
      message: args.message,
    });
    const now = new Date();

    const [log] = await prisma.$transaction([
      prisma.whatsAppMessageLog.create({
        data: {
          organizationId: organization.id,
          instanceName,
          direction: "outbound",
          to: contact.phone,
          pushName: contact.name,
          messageType: "conversation",
          text: args.message,
          status: result.status ?? "SENT",
          source: "app",
          providerEvent: "inbox_message",
          providerMessageId: result.providerMessageId,
          rawPayload: result.rawResponse as any,
        },
      }),
      prisma.contact.update({
        where: { id: contact.id },
        data: {
          lastMessage: args.message,
          lastMessageAt: now,
          lastMessageDirection: "outbound",
          resolvedAt: null,
        },
      }),
    ]);

    return { success: true, message: toMessageDto(log) };
  } catch (error) {
    console.error("Could not send inbox WhatsApp message", error);
    throw new HttpError(
      502,
      `Could not send WhatsApp message. ${getErrorMessage(error)}`,
    );
  }
};
