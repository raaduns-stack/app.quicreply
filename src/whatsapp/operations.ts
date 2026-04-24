import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  getN8nWhatsAppQrStatus,
  startN8nWhatsAppQrSession,
  type WhatsAppQrStatus,
} from "./n8n";

const organizationSelect = {
  id: true,
  userId: true,
  whatsappMode: true,
  qrConnected: true,
  apiStatus: true,
  isAiActive: true,
  qrCodeData: true,
  qrSessionId: true,
  qrStatus: true,
  qrLastSeen: true,
  qrStatusCheckedAt: true,
  qrDeviceInfo: true,
  apiPhoneNumber: true,
  apiMessagingLimit: true,
  name: true,
  flow: true,
} as const;

type OrganizationRecord = {
  id: string;
  userId: string;
  whatsappMode: string | null;
  qrConnected: boolean;
  apiStatus: string | null;
  isAiActive: boolean;
  qrCodeData: string | null;
  qrSessionId: string | null;
  qrStatus: string | null;
  qrLastSeen: Date | null;
  qrStatusCheckedAt: Date | null;
  qrDeviceInfo: string | null;
  apiPhoneNumber: string | null;
  apiMessagingLimit: string | null;
  name: string | null;
  flow: string | null;
};

export type WhatsAppWorkspaceState = {
  whatsappMode: "qr" | "api" | "both";
  isAiActive: boolean;
  qr: {
    status: WhatsAppQrStatus;
    connected: boolean;
    codeData: string | null;
    sessionId: string | null;
    deviceInfo: string | null;
    lastSeen: string | null;
    checkedAt: string | null;
  };
  api: {
    status: "none" | "pending" | "approved";
    phoneNumber: string | null;
    messagingLimit: string | null;
  };
};

const updateJenniferArgsSchema = z.object({
  isAiActive: z.boolean(),
});

function ensureUserId(context: any) {
  if (!context.user?.id) {
    throw new HttpError(401, "Only authenticated users can access WhatsApp management.");
  }

  return context.user.id as string;
}

function normalizeQrStatus(value: string | null | undefined): WhatsAppQrStatus {
  if (value === "connected" || value === "expired" || value === "failed" || value === "pending") {
    return value;
  }

  return "disconnected";
}

function normalizeApiStatus(value: string | null | undefined): "none" | "pending" | "approved" {
  if (value === "pending" || value === "approved") {
    return value;
  }

  return "none";
}

function normalizeWhatsAppMode(value: string | null | undefined): "qr" | "api" | "both" {
  if (value === "api" || value === "both") {
    return value;
  }

  return "qr";
}

function toWorkspaceState(organization: OrganizationRecord | null): WhatsAppWorkspaceState {
  const qrStatus = normalizeQrStatus(
    organization?.qrStatus ?? (organization?.qrConnected ? "connected" : "disconnected"),
  );

  return {
    whatsappMode: normalizeWhatsAppMode(organization?.whatsappMode),
    isAiActive: organization?.isAiActive ?? true,
    qr: {
      status: qrStatus,
      connected: organization?.qrConnected ?? false,
      codeData:
        qrStatus === "connected" || qrStatus === "expired" ? null : organization?.qrCodeData ?? null,
      sessionId: organization?.qrSessionId ?? null,
      deviceInfo: organization?.qrDeviceInfo ?? null,
      lastSeen: organization?.qrLastSeen?.toISOString() ?? null,
      checkedAt: organization?.qrStatusCheckedAt?.toISOString() ?? null,
    },
    api: {
      status: normalizeApiStatus(organization?.apiStatus),
      phoneNumber: organization?.apiPhoneNumber ?? null,
      messagingLimit: organization?.apiMessagingLimit ?? null,
    },
  };
}

async function findOrganization(userId: string) {
  return prisma.organization.findUnique({
    where: { userId },
    select: organizationSelect,
  });
}

async function getWorkspaceStateForUser(userId: string) {
  const organization = await findOrganization(userId);
  return toWorkspaceState(organization);
}

async function upsertOrganization(userId: string, data: Record<string, unknown>) {
  const sanitizedData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );

  return prisma.organization.upsert({
    where: { userId },
    update: sanitizedData as any,
    create: {
      userId,
      ...(sanitizedData as any),
    },
    select: organizationSelect,
  });
}

export const getWhatsAppWorkspaceState = async (
  _args: unknown,
  context: any,
): Promise<WhatsAppWorkspaceState> => {
  const userId = ensureUserId(context);
  return getWorkspaceStateForUser(userId);
};

export const startWhatsAppQrHandshake = async (
  _args: unknown,
  context: any,
): Promise<WhatsAppWorkspaceState> => {
  const userId = ensureUserId(context);
  const organization = await findOrganization(userId);

  const n8nResponse = await startN8nWhatsAppQrSession({
    userId,
    organizationId: organization?.id ?? null,
    businessName: organization?.name ?? null,
    flow: organization?.flow ?? "sales",
    whatsappMode: "qr",
  });

  const updatedOrganization = await upsertOrganization(userId, {
    whatsappMode: organization?.apiStatus === "approved" ? "both" : "qr",
    qrConnected: n8nResponse.qrStatus === "connected",
    qrStatus: n8nResponse.qrStatus,
    qrCodeData: n8nResponse.qrCodeData,
    qrSessionId: n8nResponse.sessionId,
    qrLastSeen: n8nResponse.lastSeen,
    qrStatusCheckedAt: new Date(),
    qrDeviceInfo: n8nResponse.deviceInfo,
    apiPhoneNumber: n8nResponse.apiPhoneNumber ?? organization?.apiPhoneNumber ?? undefined,
    apiMessagingLimit:
      n8nResponse.apiMessagingLimit ?? organization?.apiMessagingLimit ?? undefined,
  });

  return toWorkspaceState(updatedOrganization);
};

export const refreshWhatsAppQrStatus = async (
  _args: unknown,
  context: any,
): Promise<WhatsAppWorkspaceState> => {
  const userId = ensureUserId(context);
  const organization = await findOrganization(userId);

  if (!organization?.qrSessionId) {
    return toWorkspaceState(organization);
  }

  const n8nResponse = await getN8nWhatsAppQrStatus(organization.qrSessionId);
  const nextQrStatus = n8nResponse.qrStatus;
  const isConnected = nextQrStatus === "connected";
  const isTerminalWithoutQr = nextQrStatus === "connected" || nextQrStatus === "expired";

  const updatedOrganization = await upsertOrganization(userId, {
    whatsappMode:
      isConnected && normalizeApiStatus(organization.apiStatus) === "approved"
        ? "both"
        : organization.whatsappMode ?? "qr",
    qrConnected: isConnected,
    qrStatus: nextQrStatus,
    qrCodeData: isTerminalWithoutQr ? null : n8nResponse.qrCodeData ?? organization.qrCodeData,
    qrSessionId: n8nResponse.sessionId ?? organization.qrSessionId,
    qrLastSeen: n8nResponse.lastSeen ?? organization.qrLastSeen,
    qrStatusCheckedAt: new Date(),
    qrDeviceInfo: n8nResponse.deviceInfo ?? organization.qrDeviceInfo,
    apiPhoneNumber: n8nResponse.apiPhoneNumber ?? organization.apiPhoneNumber,
    apiMessagingLimit: n8nResponse.apiMessagingLimit ?? organization.apiMessagingLimit,
  });

  return toWorkspaceState(updatedOrganization);
};

export const updateJenniferStatus = async (
  rawArgs: unknown,
  context: any,
): Promise<WhatsAppWorkspaceState> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(updateJenniferArgsSchema, rawArgs);

  const updatedOrganization = await upsertOrganization(userId, {
    isAiActive: args.isAiActive,
  });

  return toWorkspaceState(updatedOrganization);
};

export const disconnectWhatsAppQr = async (
  _args: unknown,
  context: any,
): Promise<WhatsAppWorkspaceState> => {
  const userId = ensureUserId(context);
  const organization = await findOrganization(userId);

  if (!organization) {
    return toWorkspaceState(null);
  }

  const nextMode =
    normalizeApiStatus(organization.apiStatus) === "approved" ? "api" : "qr";

  const updatedOrganization = await upsertOrganization(userId, {
    whatsappMode: nextMode,
    qrConnected: false,
    qrStatus: "disconnected",
    qrCodeData: null,
    qrSessionId: null,
    qrLastSeen: null,
    qrStatusCheckedAt: new Date(),
    qrDeviceInfo: null,
  });

  return toWorkspaceState(updatedOrganization);
};
