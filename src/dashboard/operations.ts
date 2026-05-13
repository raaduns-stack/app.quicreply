import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import {
  getStaffDisplayName,
  getWorkspaceCurrency,
  type WorkspaceCurrency,
} from "../server/workspaceSettings";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";

const dashboardTimeRanges = [
  "current-week",
  "today",
  "last-7-days",
  "current-month",
  "all-time",
] as const;

const dashboardSummaryArgsSchema = z
  .object({
    timeRange: z.enum(dashboardTimeRanges).optional(),
  })
  .optional();

export type DashboardTimeRange = (typeof dashboardTimeRanges)[number];

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
  timeRange: DashboardTimeRange;
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

function startOfToday(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getDashboardStartDate(timeRange: DashboardTimeRange) {
  const now = new Date();

  if (timeRange === "all-time") {
    return null;
  }

  if (timeRange === "today") {
    return startOfToday(now);
  }

  if (timeRange === "last-7-days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (timeRange === "current-month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const start = startOfToday(now);
  const day = start.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

export const getDashboardSummary = async (
  rawArgs: unknown,
  context: any,
): Promise<DashboardSummary> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    dashboardSummaryArgsSchema,
    rawArgs,
  );
  const timeRange = args?.timeRange ?? "current-week";
  const startDate = getDashboardStartDate(timeRange);
  const createdAtFilter = startDate ? { gte: startDate } : undefined;
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
      where: {
        organizationId: organization.id,
        direction: "inbound",
        createdAt: createdAtFilter,
      },
    }),
    prisma.contact.count({
      where: {
        organizationId: organization.id,
        createdAt: createdAtFilter,
      },
    }),
    prisma.whatsAppMessageLog.count({
      where: {
        organizationId: organization.id,
        source: "n8n",
        createdAt: createdAtFilter,
      },
    }),
    prisma.whatsAppMessageLog.count({
      where: {
        organizationId: organization.id,
        direction: "inbound",
        status: { notIn: ["READ", "read"] },
        createdAt: createdAtFilter,
      },
    }),
    prisma.whatsAppMessageLog.findMany({
      where: { organizationId: organization.id, createdAt: createdAtFilter },
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
    timeRange,
  };
};
