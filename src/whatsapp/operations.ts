import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import {
  disconnectWhatsAppQrSession,
  fetchWhatsAppMessageLogs,
  refreshWhatsAppQrSessionStatus,
  sendWhatsAppTestMessage as sendWhatsAppTestMessageThroughProvider,
  startWhatsAppQrSession,
  type WhatsAppMessageLog,
  type WhatsAppQrStatus,
} from "./provider";

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
  evolutionInstanceName: true,
  evolutionInstanceId: true,
  qrLastError: true,
  apiPhoneNumber: true,
  apiMessagingLimit: true,
  settings: true,
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
  evolutionInstanceName: string | null;
  evolutionInstanceId: string | null;
  qrLastError: string | null;
  apiPhoneNumber: string | null;
  apiMessagingLimit: string | null;
  settings: unknown | null;
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
    lastError: string | null;
  };
  api: {
    status: "none" | "pending" | "approved";
    phoneNumber: string | null;
    messagingLimit: string | null;
  };
  webhook: {
    inboundUrl: string | null;
    enabled: boolean;
  };
};

const updateJenniferArgsSchema = z.object({
  isAiActive: z.boolean(),
});

const startWhatsAppQrHandshakeArgsSchema = z
  .object({
    forceFresh: z.boolean().optional(),
  })
  .optional();

const completeOfficialApiSetupArgsSchema = z.object({
  apiPhoneNumber: z.string().trim().optional(),
});

const sendWhatsAppTestMessageArgsSchema = z.object({
  phoneNumber: z.string().trim().min(8),
  message: z.string().trim().min(1).max(1000),
});

const updateWhatsAppWebhookSettingsArgsSchema = z.object({
  inboundUrl: z.string().trim().max(2000).optional(),
  enabled: z.boolean(),
});

function ensureUserId(context: any) {
  if (!context.user?.id) {
    throw new HttpError(
      401,
      "Only authenticated users can access WhatsApp management.",
    );
  }

  return context.user.id as string;
}

function normalizeQrStatus(value: string | null | undefined): WhatsAppQrStatus {
  if (
    value === "connected" ||
    value === "expired" ||
    value === "failed" ||
    value === "pending"
  ) {
    return value;
  }

  return "disconnected";
}

function normalizeApiStatus(
  value: string | null | undefined,
): "none" | "pending" | "approved" {
  if (value === "pending" || value === "approved") {
    return value;
  }

  return "none";
}

function normalizeWhatsAppMode(
  value: string | null | undefined,
): "qr" | "api" | "both" {
  if (value === "api" || value === "both") {
    return value;
  }

  return "qr";
}

function normalizeSettings(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function getWebhookSettings(settings: unknown) {
  const whatsappWebhook = normalizeSettings(settings).whatsappWebhook;
  const record =
    whatsappWebhook &&
    typeof whatsappWebhook === "object" &&
    !Array.isArray(whatsappWebhook)
      ? (whatsappWebhook as Record<string, unknown>)
      : {};
  const inboundUrl =
    typeof record.inboundUrl === "string" && record.inboundUrl.trim()
      ? record.inboundUrl
      : null;

  return {
    inboundUrl,
    enabled: record.enabled === true,
  };
}

function mergeWebhookSettings(
  settings: unknown,
  args: z.infer<typeof updateWhatsAppWebhookSettingsArgsSchema>,
) {
  const nextSettings = normalizeSettings(settings);

  nextSettings.whatsappWebhook = {
    inboundUrl: args.inboundUrl?.trim() || null,
    enabled: args.enabled,
  };

  return nextSettings;
}

function getConnectedInstanceName(organization: OrganizationRecord | null) {
  if (!organization?.qrConnected) {
    return null;
  }

  const qrStatus = normalizeQrStatus(
    organization.qrStatus ?? (organization.qrConnected ? "connected" : null),
  );

  if (qrStatus !== "connected") {
    return null;
  }

  return organization.qrSessionId ?? organization.evolutionInstanceName ?? null;
}

function toWorkspaceState(
  organization: OrganizationRecord | null,
): WhatsAppWorkspaceState {
  const qrStatus = normalizeQrStatus(
    organization?.qrStatus ??
      (organization?.qrConnected ? "connected" : "disconnected"),
  );

  return {
    whatsappMode: normalizeWhatsAppMode(organization?.whatsappMode),
    isAiActive: organization?.isAiActive ?? true,
    qr: {
      status: qrStatus,
      connected: organization?.qrConnected ?? false,
      codeData:
        qrStatus === "connected" || qrStatus === "expired"
          ? null
          : organization?.qrCodeData ?? null,
      sessionId: organization?.qrSessionId ?? null,
      deviceInfo: organization?.qrDeviceInfo ?? null,
      lastSeen: organization?.qrLastSeen?.toISOString() ?? null,
      checkedAt: organization?.qrStatusCheckedAt?.toISOString() ?? null,
      lastError: organization?.qrLastError ?? null,
    },
    api: {
      status: normalizeApiStatus(organization?.apiStatus),
      phoneNumber: organization?.apiPhoneNumber ?? null,
      messagingLimit: organization?.apiMessagingLimit ?? null,
    },
    webhook: getWebhookSettings(organization?.settings),
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

async function upsertOrganization(
  userId: string,
  data: Record<string, unknown>,
) {
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

function buildEvolutionInstanceName(organizationId: string) {
  return `quicreply-${organizationId}`.toLowerCase();
}

function getErrorRecord(error: unknown): Record<string, unknown> | null {
  return error && typeof error === "object"
    ? (error as Record<string, unknown>)
    : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "WhatsApp provider request failed. Please try again.";
}

function getSafeOperationErrorStatus(error: unknown) {
  const record = getErrorRecord(error);

  for (const candidate of [record?.statusCode, record?.status]) {
    if (typeof candidate === "number") {
      return candidate === 401 || candidate === 403 ? 502 : candidate;
    }

    if (typeof candidate === "string" && /^\d+$/.test(candidate)) {
      const status = Number(candidate);
      return status === 401 || status === 403 ? 502 : status;
    }
  }

  return 502;
}

async function markQrProviderFailure(
  userId: string,
  organization: OrganizationRecord,
  message: string,
) {
  return upsertOrganization(userId, {
    whatsappMode: organization.apiStatus === "approved" ? "both" : "qr",
    qrConnected: false,
    qrStatus: "failed",
    qrCodeData: null,
    qrSessionId:
      organization.qrSessionId ?? organization.evolutionInstanceName ?? null,
    qrLastSeen: organization.qrLastSeen,
    qrStatusCheckedAt: new Date(),
    qrDeviceInfo: organization.qrDeviceInfo,
    evolutionInstanceName: organization.evolutionInstanceName ?? undefined,
    evolutionInstanceId: organization.evolutionInstanceId ?? undefined,
    qrLastError: message,
  });
}

async function ensureOrganizationForUser(userId: string) {
  const organization = await findOrganization(userId);
  if (organization) {
    return organization;
  }

  return upsertOrganization(userId, {});
}

function toWhatsAppMessageLogDto(log: {
  id: string;
  direction: string;
  from: string | null;
  to: string | null;
  pushName: string | null;
  messageType: string | null;
  text: string | null;
  createdAt: Date;
  status: string | null;
  source: string | null;
}): WhatsAppMessageLog {
  return {
    id: log.id,
    direction: log.direction === "outbound" ? "outbound" : "inbound",
    from: log.from,
    to: log.to,
    pushName: log.pushName,
    messageType: log.messageType,
    text: log.text || "Unsupported message type",
    timestamp: log.createdAt.toISOString(),
    status: log.status,
    source: log.source,
  };
}

async function getStoredWhatsAppMessageLogs(
  organizationId: string,
  limit = 20,
): Promise<WhatsAppMessageLog[]> {
  const logs = await prisma.whatsAppMessageLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 50),
  });

  return logs.map(toWhatsAppMessageLogDto);
}

export const getWhatsAppWorkspaceState = async (
  _args: unknown,
  context: any,
): Promise<WhatsAppWorkspaceState> => {
  const userId = ensureUserId(context);
  return getWorkspaceStateForUser(userId);
};

export const getWhatsAppMessageLogs = async (
  _args: unknown,
  context: any,
): Promise<WhatsAppMessageLog[]> => {
  const userId = ensureUserId(context);
  const organization = await findOrganization(userId);

  if (!organization) {
    return [];
  }

  const storedLogs = await getStoredWhatsAppMessageLogs(organization.id);
  const instanceName = getConnectedInstanceName(organization);

  if (!instanceName) {
    return storedLogs;
  }

  try {
    const providerLogs = await fetchWhatsAppMessageLogs({
      instanceName,
      limit: 20,
    });

    return providerLogs.length > 0 ? providerLogs : storedLogs;
  } catch {
    return storedLogs;
  }
};

export const startWhatsAppQrHandshake = async (
  rawArgs: unknown,
  context: any,
): Promise<WhatsAppWorkspaceState> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    startWhatsAppQrHandshakeArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);
  const instanceName =
    organization.evolutionInstanceName ??
    buildEvolutionInstanceName(organization.id);

  let qrResponse;
  try {
    if (args?.forceFresh) {
      await disconnectWhatsAppQrSession({ instanceName });
    }

    qrResponse = await startWhatsAppQrSession({ instanceName });
  } catch (error) {
    const message = getErrorMessage(error);
    await markQrProviderFailure(userId, organization, message);
    throw new HttpError(getSafeOperationErrorStatus(error), message);
  }

  const updatedOrganization = await upsertOrganization(userId, {
    whatsappMode: organization?.apiStatus === "approved" ? "both" : "qr",
    qrConnected: qrResponse.qrStatus === "connected",
    qrStatus: qrResponse.qrStatus,
    qrCodeData: qrResponse.qrCodeData,
    qrSessionId: qrResponse.sessionId,
    qrLastSeen: qrResponse.lastSeen,
    qrStatusCheckedAt: new Date(),
    qrDeviceInfo: qrResponse.deviceInfo,
    evolutionInstanceName:
      qrResponse.evolutionInstanceName ??
      organization.evolutionInstanceName ??
      undefined,
    evolutionInstanceId:
      qrResponse.evolutionInstanceId ??
      organization.evolutionInstanceId ??
      undefined,
    qrLastError: qrResponse.errorMessage ?? null,
    apiPhoneNumber:
      qrResponse.apiPhoneNumber ?? organization?.apiPhoneNumber ?? undefined,
    apiMessagingLimit:
      qrResponse.apiMessagingLimit ??
      organization?.apiMessagingLimit ??
      undefined,
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

  const instanceName = organization.qrSessionId;
  let qrResponse;
  try {
    qrResponse = await refreshWhatsAppQrSessionStatus({ instanceName });
  } catch (error) {
    const message = getErrorMessage(error);
    await markQrProviderFailure(userId, organization, message);
    throw new HttpError(getSafeOperationErrorStatus(error), message);
  }
  const nextQrStatus = qrResponse.qrStatus;
  const isConnected = nextQrStatus === "connected";
  const isTerminalWithoutQr =
    nextQrStatus === "connected" || nextQrStatus === "expired";

  const updatedOrganization = await upsertOrganization(userId, {
    whatsappMode:
      isConnected && normalizeApiStatus(organization.apiStatus) === "approved"
        ? "both"
        : organization.whatsappMode ?? "qr",
    qrConnected: isConnected,
    qrStatus: nextQrStatus,
    qrCodeData: isTerminalWithoutQr
      ? null
      : qrResponse.qrCodeData ?? organization.qrCodeData,
    qrSessionId: qrResponse.sessionId ?? organization.qrSessionId,
    qrLastSeen: qrResponse.lastSeen ?? organization.qrLastSeen,
    qrStatusCheckedAt: new Date(),
    qrDeviceInfo:
      qrResponse.deviceInfo ?? (isConnected ? null : organization.qrDeviceInfo),
    evolutionInstanceName:
      qrResponse.evolutionInstanceName ??
      organization.evolutionInstanceName ??
      instanceName,
    evolutionInstanceId:
      qrResponse.evolutionInstanceId ?? organization.evolutionInstanceId,
    qrLastError: qrResponse.errorMessage ?? null,
    apiPhoneNumber: qrResponse.apiPhoneNumber ?? organization.apiPhoneNumber,
    apiMessagingLimit:
      qrResponse.apiMessagingLimit ?? organization.apiMessagingLimit,
  });

  return toWorkspaceState(updatedOrganization);
};

export const updateJenniferStatus = async (
  rawArgs: unknown,
  context: any,
): Promise<WhatsAppWorkspaceState> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    updateJenniferArgsSchema,
    rawArgs,
  );

  const updatedOrganization = await upsertOrganization(userId, {
    isAiActive: args.isAiActive,
  });

  return toWorkspaceState(updatedOrganization);
};

export const sendWhatsAppTestMessage = async (
  rawArgs: unknown,
  context: any,
): Promise<{ success: true }> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    sendWhatsAppTestMessageArgsSchema,
    rawArgs,
  );
  const organization = await findOrganization(userId);
  const instanceName = getConnectedInstanceName(organization);

  if (!instanceName) {
    throw new HttpError(400, "Connect QR before sending a test message.");
  }

  const result = await sendWhatsAppTestMessageThroughProvider({
    instanceName,
    phoneNumber: args.phoneNumber,
    message: args.message,
  });

  await prisma.whatsAppMessageLog.create({
    data: {
      organizationId: organization!.id,
      instanceName,
      direction: "outbound",
      to: args.phoneNumber,
      messageType: "conversation",
      text: args.message,
      status: "SENT",
      source: "app",
      providerEvent: "test_message",
    },
  });

  return result;
};

export const updateWhatsAppWebhookSettings = async (
  rawArgs: unknown,
  context: any,
): Promise<WhatsAppWorkspaceState> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    updateWhatsAppWebhookSettingsArgsSchema,
    rawArgs,
  );

  if (args.enabled && !args.inboundUrl?.trim()) {
    throw new HttpError(
      400,
      "Add the n8n webhook URL before enabling forwarding.",
    );
  }

  const organization = await ensureOrganizationForUser(userId);
  const updatedOrganization = await upsertOrganization(userId, {
    settings: mergeWebhookSettings(organization.settings, args),
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

  const instanceName =
    organization.qrSessionId ?? organization.evolutionInstanceName ?? null;
  if (instanceName) {
    await disconnectWhatsAppQrSession({ instanceName });
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
    qrLastError: null,
  });

  return toWorkspaceState(updatedOrganization);
};

export const completeOfficialApiSetup = async (
  rawArgs: unknown,
  context: any,
): Promise<{ success: true }> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    completeOfficialApiSetupArgsSchema,
    rawArgs,
  );

  const organization = await findOrganization(userId);
  const hasQr = organization?.qrConnected ?? false;

  await prisma.$transaction(async (tx) => {
    await tx.organization.upsert({
      where: { userId },
      update: {
        whatsappMode: hasQr ? "both" : "api",
        apiStatus: "approved",
        apiPhoneNumber:
          args.apiPhoneNumber || organization?.apiPhoneNumber || null,
        apiMessagingLimit: organization?.apiMessagingLimit ?? "10,000 msgs/day",
      },
      create: {
        userId,
        whatsappMode: "api",
        apiStatus: "approved",
        apiPhoneNumber: args.apiPhoneNumber || null,
        apiMessagingLimit: "10,000 msgs/day",
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        onboardingStep: 6,
        onboardingCompleted: true,
      },
    });
  });

  return { success: true };
};
