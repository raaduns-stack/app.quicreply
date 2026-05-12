import { HttpError, prisma } from "wasp/server";
import {
  getStaffDisplayName,
  getWorkspaceCurrency,
  type WorkspaceCurrency,
} from "../server/workspaceSettings";

export type DashboardSummary = {
  organizationName: string;
  staffDisplayName: string;
  currency: WorkspaceCurrency;
  messagesReceived: number;
  leadsCaptured: number;
  aiResponses: number;
  revenueInPipeline: number;
  unreadMessages: number;
  qrConnected: boolean;
  apiStatus: "none" | "pending" | "approved";
  isAiActive: boolean;
  recentActivities: Array<{
    id: string;
    label: string;
    time: string;
    badge: "LEAD" | "AI" | "MESSAGE" | "CAMPAIGN" | "QR";
  }>;
  recentConversations: Array<{
    id: string;
    name: string;
    initials: string;
    snippet: string;
    time: string;
    unread?: string;
  }>;
  lastCampaign: {
    id: string;
    name: string;
    status: string;
    sent: number;
    delivered: number;
    failed: number;
    createdAt: string;
  } | null;
};

function ensureUserId(context: any) {
  if (!context.user?.id) {
    throw new HttpError(401, "Only authenticated users can access dashboard.");
  }

  return context.user.id as string;
}

function formatRelativeTime(value: Date) {
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

  return `${Math.floor(diffHours / 24)}d ago`;
}

function makeInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function normalizeApiStatus(value: string | null | undefined) {
  if (value === "pending" || value === "approved") {
    return value;
  }

  return "none";
}

export const getDashboardSummary = async (
  _args: unknown,
  context: any,
): Promise<DashboardSummary> => {
  const userId = ensureUserId(context);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      username: true,
      firstName: true,
      lastName: true,
    },
  });

  const organization = await prisma.organization.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: {
      id: true,
      name: true,
      country: true,
      settings: true,
      qrConnected: true,
      apiStatus: true,
      isAiActive: true,
      contacts: {
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
        take: 5,
        select: {
          id: true,
          name: true,
          lastMessage: true,
          lastMessageAt: true,
          updatedAt: true,
        },
      },
      campaigns: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          name: true,
          status: true,
          sentCount: true,
          deliveredCount: true,
          failedCount: true,
          createdAt: true,
        },
      },
    },
  });

  const [
    messagesReceived,
    leadsCaptured,
    aiResponses,
    unreadMessages,
    recentLogs,
  ] = await prisma.$transaction([
    prisma.whatsAppMessageLog.count({
      where: { organizationId: organization.id, direction: "inbound" },
    }),
    prisma.contact.count({ where: { organizationId: organization.id } }),
    prisma.whatsAppMessageLog.count({
      where: { organizationId: organization.id, source: "n8n" },
    }),
    prisma.whatsAppMessageLog.count({
      where: {
        organizationId: organization.id,
        direction: "inbound",
        status: { notIn: ["READ", "read"] },
      },
    }),
    prisma.whatsAppMessageLog.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        direction: true,
        text: true,
        source: true,
        createdAt: true,
      },
    }),
  ]);

  const recentActivities: DashboardSummary["recentActivities"] = [
    ...recentLogs.map((log) => ({
      id: log.id,
      label:
        log.source === "n8n"
          ? "Jennifer replied to a WhatsApp message"
          : log.direction === "inbound"
            ? log.text || "New WhatsApp message received"
            : log.text || "WhatsApp message sent",
      time: formatRelativeTime(log.createdAt),
      badge:
        log.source === "n8n"
          ? ("AI" as const)
          : log.direction === "inbound"
            ? ("MESSAGE" as const)
            : ("QR" as const),
    })),
    ...organization.contacts.slice(0, 2).map((contact) => ({
      id: contact.id,
      label: `Lead captured: ${contact.name}`,
      time: formatRelativeTime(contact.updatedAt),
      badge: "LEAD" as const,
    })),
  ].slice(0, 5);

  const lastCampaign = organization.campaigns[0] ?? null;

  return {
    organizationName: organization.name || "Revenue Sales OS",
    staffDisplayName: getStaffDisplayName(user ?? {}),
    currency: getWorkspaceCurrency(organization.settings, organization.country),
    messagesReceived,
    leadsCaptured,
    aiResponses,
    revenueInPipeline: 0,
    unreadMessages,
    qrConnected: organization.qrConnected,
    apiStatus: normalizeApiStatus(organization.apiStatus),
    isAiActive: organization.isAiActive,
    recentActivities,
    recentConversations: organization.contacts.map((contact, index) => ({
      id: contact.id,
      name: contact.name,
      initials: makeInitials(contact.name),
      snippet: contact.lastMessage || "No messages yet",
      time: formatRelativeTime(contact.lastMessageAt ?? contact.updatedAt),
      unread:
        index === 0 && unreadMessages > 0 ? String(unreadMessages) : undefined,
    })),
    lastCampaign: lastCampaign
      ? {
          id: lastCampaign.id,
          name: lastCampaign.name,
          status: lastCampaign.status,
          sent: lastCampaign.sentCount,
          delivered: lastCampaign.deliveredCount,
          failed: lastCampaign.failedCount,
          createdAt: lastCampaign.createdAt.toISOString(),
        }
      : null,
  };
};
