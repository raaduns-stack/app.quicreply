import { HttpError, env, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { subscribeMetaAppToWaba } from "./metaCloudApi";
import {
  cleanupStaleEvolutionInstancesForOrganization,
  disconnectWhatsAppQrSession,
  fetchWhatsAppMessageLogs,
  refreshWhatsAppQrSessionStatus,
  startWhatsAppQrSession,
  type WhatsAppMessageLog,
  type WhatsAppQrStatus,
} from "./provider";
import { sendOrganizationWhatsAppTextMessage } from "./transport";

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
  metrics: {
    totalMessages: number;
    activeSessions: number;
    qrUsageToday: number;
    aiReplies: number;
  };
  qr: {
    status: WhatsAppQrStatus;
    connected: boolean;
    disconnectReason:
      | "linked_device_lost"
      | "qr_expired"
      | "provider_error"
      | "manual_disconnect"
      | "disconnected"
      | null;
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
    metaCloudApi: {
      wabaId: string | null;
      phoneNumberId: string | null;
      appSubscribedAt: string | null;
      lastProvisioningError: string | null;
      webhookVerifiedAt: string | null;
      lastInboundAt: string | null;
      webhookUrl: string | null;
    };
    readiness: {
      appConfigured: boolean;
      embeddedSignupLinked: boolean;
      assetsCaptured: boolean;
      appSubscribed: boolean;
      webhookConfigured: boolean;
      webhookVerified: boolean;
      canSendViaApi: boolean;
      missing: string[];
    };
    embeddedSignup: {
      status:
        | "not_started"
        | "session_prepared"
        | "assets_captured"
        | "linked"
        | "failed";
      sessionId: string | null;
      state: string | null;
      appId: string | null;
      configurationId: string | null;
      businessPortfolioId: string | null;
      wabaId: string | null;
      phoneNumberId: string | null;
      lastError: string | null;
      startedAt: string | null;
      authorizationCodeReceivedAt: string | null;
      completedAt: string | null;
    };
    setupRequest: {
      legalName: string | null;
      registrationNumber: string | null;
      email: string | null;
      phone: string | null;
      businessName: string | null;
      website: string | null;
      country: string | null;
      address: string | null;
      businessManagerId: string | null;
      businessPortfolioId: string | null;
      metaBusinessName: string | null;
      displayName: string | null;
      wabaId: string | null;
      phoneNumberId: string | null;
      apiPhoneNumber: string | null;
      dailyVolume: string | null;
      useCase: string | null;
      templateExample: string | null;
      uploadedDocs: string[];
      metaAuthorizationRequested: boolean;
      submittedAt: string | null;
    } | null;
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
  legalName: z.string().trim().max(160).optional(),
  registrationNumber: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().max(80).optional(),
  apiPhoneNumber: z.string().trim().optional(),
  businessName: z.string().trim().max(160).optional(),
  website: z.string().trim().max(300).optional(),
  country: z.string().trim().max(120).optional(),
  address: z.string().trim().max(500).optional(),
  businessManagerId: z.string().trim().max(160).optional(),
  businessPortfolioId: z.string().trim().max(160).optional(),
  metaBusinessName: z.string().trim().max(160).optional(),
  displayName: z.string().trim().max(160).optional(),
  wabaId: z.string().trim().max(160).optional(),
  phoneNumberId: z.string().trim().max(160).optional(),
  dailyVolume: z.string().trim().max(120).optional(),
  useCase: z.string().trim().max(1000).optional(),
  templateExample: z.string().trim().max(1000).optional(),
  uploadedDocs: z.array(z.string().trim().max(240)).optional(),
  metaAuthorizationRequested: z.boolean().optional(),
});

const sendWhatsAppTestMessageArgsSchema = z.object({
  phoneNumber: z.string().trim().min(8),
  message: z.string().trim().min(1).max(1000),
});

const updateWhatsAppWebhookSettingsArgsSchema = z.object({
  inboundUrl: z.string().trim().max(2000).optional(),
  enabled: z.boolean(),
});

const saveOfficialApiEmbeddedSignupAssetsArgsSchema = z.object({
  businessPortfolioId: z.string().trim().max(160).optional(),
  businessManagerId: z.string().trim().max(160).optional(),
  metaBusinessName: z.string().trim().max(160).optional(),
  displayName: z.string().trim().max(160).optional(),
  wabaId: z.string().trim().max(160).optional(),
  phoneNumberId: z.string().trim().max(160).optional(),
  apiPhoneNumber: z.string().trim().optional(),
});

const completeOfficialApiEmbeddedSignupSessionArgsSchema = z.object({
  code: z.string().trim().min(1),
  businessPortfolioId: z.string().trim().max(160).optional(),
  businessManagerId: z.string().trim().max(160).optional(),
  metaBusinessName: z.string().trim().max(160).optional(),
  displayName: z.string().trim().max(160).optional(),
  wabaId: z.string().trim().max(160).optional(),
  phoneNumberId: z.string().trim().max(160).optional(),
  apiPhoneNumber: z.string().trim().optional(),
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

function getQrDisconnectReason(settings: unknown) {
  const value = normalizeSettings(settings).whatsappQrDisconnectReason;

  return value === "linked_device_lost" ||
    value === "qr_expired" ||
    value === "provider_error" ||
    value === "manual_disconnect" ||
    value === "disconnected"
    ? value
    : null;
}

type QrDisconnectReason = NonNullable<
  WhatsAppWorkspaceState["qr"]["disconnectReason"]
>;

function mergeQrDisconnectReason(
  settings: unknown,
  reason: QrDisconnectReason | null,
) {
  const nextSettings = normalizeSettings(settings);

  if (reason) {
    nextSettings.whatsappQrDisconnectReason = reason;
  } else {
    delete nextSettings.whatsappQrDisconnectReason;
  }

  return nextSettings;
}

function logQrStateTransition(input: {
  organizationId: string;
  instanceName?: string | null;
  source:
    | "start_handshake"
    | "refresh_status"
    | "provider_failure"
    | "manual_disconnect";
  previousStatus: string | null | undefined;
  nextStatus: string | null | undefined;
  previousReason: QrDisconnectReason | null;
  nextReason: QrDisconnectReason | null;
  previousConnected: boolean;
  nextConnected: boolean;
  providerMessage?: string | null;
}) {
  const statusChanged = input.previousStatus !== input.nextStatus;
  const reasonChanged = input.previousReason !== input.nextReason;
  const connectedChanged = input.previousConnected !== input.nextConnected;
  const hasProviderMessage = Boolean(input.providerMessage);

  if (!statusChanged && !reasonChanged && !connectedChanged && !hasProviderMessage) {
    return;
  }

  console.info("WhatsApp QR state transition.", {
    organizationId: input.organizationId,
    instanceName: input.instanceName ?? null,
    source: input.source,
    previousStatus: input.previousStatus ?? null,
    nextStatus: input.nextStatus ?? null,
    previousReason: input.previousReason,
    nextReason: input.nextReason,
    previousConnected: input.previousConnected,
    nextConnected: input.nextConnected,
    providerMessage: input.providerMessage ?? null,
  });
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

function mergeApiSetupRequestSettings(
  settings: unknown,
  args: z.infer<typeof completeOfficialApiSetupArgsSchema>,
) {
  const nextSettings = normalizeSettings(settings);

  nextSettings.whatsappApiSetup = {
    legalName: args.legalName?.trim() || null,
    registrationNumber: args.registrationNumber?.trim() || null,
    email: args.email?.trim() || null,
    phone: args.phone?.trim() || null,
    businessName: args.businessName?.trim() || null,
    website: args.website?.trim() || null,
    country: args.country?.trim() || null,
    address: args.address?.trim() || null,
    businessManagerId: args.businessManagerId?.trim() || null,
    businessPortfolioId: args.businessPortfolioId?.trim() || null,
    metaBusinessName: args.metaBusinessName?.trim() || null,
    displayName: args.displayName?.trim() || null,
    wabaId: args.wabaId?.trim() || null,
    phoneNumberId: args.phoneNumberId?.trim() || null,
    apiPhoneNumber: args.apiPhoneNumber?.trim() || null,
    dailyVolume: args.dailyVolume?.trim() || null,
    useCase: args.useCase?.trim() || null,
    templateExample: args.templateExample?.trim() || null,
    uploadedDocs: args.uploadedDocs ?? [],
    metaAuthorizationRequested: args.metaAuthorizationRequested === true,
    submittedAt: new Date().toISOString(),
  };

  return nextSettings;
}

function getApiSetupRequestSettings(settings: unknown) {
  const whatsappApiSetup = normalizeSettings(settings).whatsappApiSetup;
  const record =
    whatsappApiSetup &&
    typeof whatsappApiSetup === "object" &&
    !Array.isArray(whatsappApiSetup)
      ? (whatsappApiSetup as Record<string, unknown>)
      : null;

  if (!record) {
    return null;
  }

  const getString = (key: string) =>
    typeof record[key] === "string" && record[key].trim()
      ? record[key].trim()
      : null;

  return {
    legalName: getString("legalName"),
    registrationNumber: getString("registrationNumber"),
    email: getString("email"),
    phone: getString("phone"),
    businessName: getString("businessName"),
    website: getString("website"),
    country: getString("country"),
    address: getString("address"),
    businessManagerId: getString("businessManagerId"),
    businessPortfolioId: getString("businessPortfolioId"),
    metaBusinessName: getString("metaBusinessName"),
    displayName: getString("displayName"),
    wabaId: getString("wabaId"),
    phoneNumberId: getString("phoneNumberId"),
    apiPhoneNumber: getString("apiPhoneNumber"),
    dailyVolume: getString("dailyVolume"),
    useCase: getString("useCase"),
    templateExample: getString("templateExample"),
    uploadedDocs: Array.isArray(record.uploadedDocs)
      ? record.uploadedDocs.filter(
          (item): item is string => typeof item === "string" && !!item.trim(),
        )
      : [],
    metaAuthorizationRequested: record.metaAuthorizationRequested === true,
    submittedAt: getString("submittedAt"),
  };
}

function getEmbeddedSignupSettings(settings: unknown) {
  const embeddedSignup = normalizeSettings(settings).whatsappEmbeddedSignup;
  const record =
    embeddedSignup &&
    typeof embeddedSignup === "object" &&
    !Array.isArray(embeddedSignup)
      ? (embeddedSignup as Record<string, unknown>)
      : null;

  if (!record) {
    return null;
  }

  const getString = (key: string) =>
    typeof record[key] === "string" && record[key].trim()
      ? record[key].trim()
      : null;

  const rawStatus = getString("status");
  const status: WhatsAppWorkspaceState["api"]["embeddedSignup"]["status"] =
    rawStatus === "session_prepared" ||
    rawStatus === "assets_captured" ||
    rawStatus === "linked" ||
    rawStatus === "failed"
      ? rawStatus
      : "not_started";

  return {
    status,
    sessionId: getString("sessionId"),
    state: getString("state"),
    appId: getString("appId"),
    configurationId: getString("configurationId"),
    businessPortfolioId: getString("businessPortfolioId"),
    wabaId: getString("wabaId"),
    phoneNumberId: getString("phoneNumberId"),
    lastError: getString("lastError"),
    startedAt: getString("startedAt"),
    authorizationCodeReceivedAt: getString("authorizationCodeReceivedAt"),
    completedAt: getString("completedAt"),
  };
}

function mergeEmbeddedSignupSettings(
  settings: unknown,
  args: {
    status?:
      | "not_started"
      | "session_prepared"
      | "assets_captured"
      | "linked"
      | "failed";
    sessionId?: string | null;
    state?: string | null;
    appId?: string | null;
    configurationId?: string | null;
    businessPortfolioId?: string | null;
    wabaId?: string | null;
    phoneNumberId?: string | null;
    lastError?: string | null;
    startedAt?: string | null;
    authorizationCodeReceivedAt?: string | null;
    completedAt?: string | null;
  },
) {
  const nextSettings = normalizeSettings(settings);
  const current = getEmbeddedSignupSettings(settings);

  nextSettings.whatsappEmbeddedSignup = {
    status: args.status ?? current?.status ?? "not_started",
    sessionId: args.sessionId ?? current?.sessionId ?? null,
    state: args.state ?? current?.state ?? null,
    appId: args.appId ?? current?.appId ?? null,
    configurationId: args.configurationId ?? current?.configurationId ?? null,
    businessPortfolioId:
      args.businessPortfolioId ?? current?.businessPortfolioId ?? null,
    wabaId: args.wabaId ?? current?.wabaId ?? null,
    phoneNumberId: args.phoneNumberId ?? current?.phoneNumberId ?? null,
    lastError: args.lastError ?? current?.lastError ?? null,
    startedAt: args.startedAt ?? current?.startedAt ?? null,
    authorizationCodeReceivedAt:
      args.authorizationCodeReceivedAt ??
      current?.authorizationCodeReceivedAt ??
      null,
    completedAt: args.completedAt ?? current?.completedAt ?? null,
  };

  return nextSettings;
}

function getMetaCloudApiSettings(settings: unknown) {
  const metaCloudApi = normalizeSettings(settings).whatsappMetaCloudApi;
  const record =
    metaCloudApi &&
    typeof metaCloudApi === "object" &&
    !Array.isArray(metaCloudApi)
      ? (metaCloudApi as Record<string, unknown>)
      : null;

  if (!record) {
    return null;
  }

  const getString = (key: string) =>
    typeof record[key] === "string" && record[key].trim()
      ? record[key].trim()
      : null;

  return {
    wabaId: getString("wabaId"),
    phoneNumberId: getString("phoneNumberId"),
    appSubscribedAt: getString("appSubscribedAt"),
    lastProvisioningError: getString("lastProvisioningError"),
    webhookVerifiedAt: getString("webhookVerifiedAt"),
    lastInboundAt: getString("lastInboundAt"),
  };
}

function mergeMetaCloudApiSettings(
  settings: unknown,
  args: {
    wabaId?: string | null;
    phoneNumberId?: string | null;
    appSubscribedAt?: string | null;
    lastProvisioningError?: string | null;
    webhookVerifiedAt?: string | null;
    lastInboundAt?: string | null;
  },
) {
  const nextSettings = normalizeSettings(settings);
  const current = getMetaCloudApiSettings(settings);

  nextSettings.whatsappMetaCloudApi = {
    wabaId: args.wabaId ?? current?.wabaId ?? null,
    phoneNumberId: args.phoneNumberId ?? current?.phoneNumberId ?? null,
    appSubscribedAt: args.appSubscribedAt ?? current?.appSubscribedAt ?? null,
    lastProvisioningError:
      args.lastProvisioningError ?? current?.lastProvisioningError ?? null,
    webhookVerifiedAt:
      args.webhookVerifiedAt ?? current?.webhookVerifiedAt ?? null,
    lastInboundAt: args.lastInboundAt ?? current?.lastInboundAt ?? null,
  };

  return nextSettings;
}

function getMetaWebhookUrl() {
  const baseUrl = env.WHATSAPP_WEBHOOK_BASE_URL?.trim().replace(/\/+$/, "");
  return baseUrl ? `${baseUrl}/webhooks/meta/whatsapp` : null;
}

function getMetaCloudApiReadiness(input: {
  apiStatus: "none" | "pending" | "approved";
  embeddedSignup: WhatsAppWorkspaceState["api"]["embeddedSignup"];
  metaCloudApi: WhatsAppWorkspaceState["api"]["metaCloudApi"];
}) {
  const appConfigured =
    Boolean(input.embeddedSignup.appId) &&
    Boolean(input.embeddedSignup.configurationId);
  const embeddedSignupLinked = input.embeddedSignup.status === "linked";
  const assetsCaptured =
    Boolean(input.metaCloudApi.wabaId) && Boolean(input.metaCloudApi.phoneNumberId);
  const appSubscribed = Boolean(input.metaCloudApi.appSubscribedAt);
  const webhookConfigured = Boolean(input.metaCloudApi.webhookUrl);
  const webhookVerified = Boolean(input.metaCloudApi.webhookVerifiedAt);
  const canSendViaApi = input.apiStatus === "approved" && assetsCaptured && appSubscribed;
  const missing: string[] = [];

  if (!appConfigured) {
    missing.push("Meta app ID / config ID");
  }
  if (!embeddedSignupLinked) {
    missing.push("Embedded Signup link");
  }
  if (!assetsCaptured) {
    missing.push("WABA ID / phone number ID");
  }
  if (!appSubscribed) {
    missing.push("WABA app subscription");
  }
  if (!webhookConfigured) {
    missing.push("Webhook base URL");
  }
  if (webhookConfigured && !webhookVerified) {
    missing.push("Meta webhook verification");
  }

  return {
    appConfigured,
    embeddedSignupLinked,
    assetsCaptured,
    appSubscribed,
    webhookConfigured,
    webhookVerified,
    canSendViaApi,
    missing,
  };
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

async function getWhatsAppMetrics(organizationId: string | null) {
  if (!organizationId) {
    return {
      totalMessages: 0,
      activeSessions: 0,
      qrUsageToday: 0,
      aiReplies: 0,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalMessages, qrUsageToday, aiReplies] = await prisma.$transaction([
    prisma.whatsAppMessageLog.count({ where: { organizationId } }),
    prisma.whatsAppMessageLog.count({
      where: {
        organizationId,
        createdAt: { gte: today },
      },
    }),
    prisma.whatsAppMessageLog.count({
      where: {
        organizationId,
        source: "n8n",
      },
    }),
  ]);

  return {
    totalMessages,
    activeSessions: 0,
    qrUsageToday,
    aiReplies,
  };
}

async function toWorkspaceState(
  organization: OrganizationRecord | null,
): Promise<WhatsAppWorkspaceState> {
  const qrStatus = normalizeQrStatus(
    organization?.qrStatus ??
      (organization?.qrConnected ? "connected" : "disconnected"),
  );
  const metrics = await getWhatsAppMetrics(organization?.id ?? null);
  const apiStatus = normalizeApiStatus(organization?.apiStatus);
  const embeddedSignup =
    getEmbeddedSignupSettings(organization?.settings) ?? {
      status: "not_started",
      sessionId: null,
      state: null,
      appId: null,
      configurationId: null,
      businessPortfolioId: null,
      wabaId: null,
      phoneNumberId: null,
      lastError: null,
      startedAt: null,
      authorizationCodeReceivedAt: null,
      completedAt: null,
    };
  const metaCloudApi: WhatsAppWorkspaceState["api"]["metaCloudApi"] = {
    ...(getMetaCloudApiSettings(organization?.settings) ?? {
      wabaId: null,
      phoneNumberId: null,
      appSubscribedAt: null,
      lastProvisioningError: null,
      webhookVerifiedAt: null,
      lastInboundAt: null,
    }),
    webhookUrl: getMetaWebhookUrl(),
  };

  return {
    whatsappMode: normalizeWhatsAppMode(organization?.whatsappMode),
    isAiActive: organization?.isAiActive ?? true,
    metrics: {
      ...metrics,
      activeSessions: organization?.qrConnected ? 1 : 0,
    },
    qr: {
      status: qrStatus,
      connected: organization?.qrConnected ?? false,
      disconnectReason:
        qrStatus === "connected" || qrStatus === "pending"
          ? null
          : qrStatus === "expired"
            ? "qr_expired"
            : getQrDisconnectReason(organization?.settings) ??
              (qrStatus === "failed" ? "provider_error" : "disconnected"),
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
      status: apiStatus,
      phoneNumber: organization?.apiPhoneNumber ?? null,
      messagingLimit: organization?.apiMessagingLimit ?? null,
      metaCloudApi,
      readiness: getMetaCloudApiReadiness({
        apiStatus,
        embeddedSignup,
        metaCloudApi,
      }),
      embeddedSignup,
      setupRequest: getApiSetupRequestSettings(organization?.settings),
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

function buildEvolutionInstanceName(organizationId: string, fresh = false) {
  const baseName = `quicreply-${organizationId}`.toLowerCase();
  return fresh ? `${baseName}-${Date.now().toString(36)}` : baseName;
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
  const nextReason: QrDisconnectReason = "provider_error";
  const updatedOrganization = await upsertOrganization(userId, {
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
    settings: mergeQrDisconnectReason(
      organization.settings,
      nextReason,
    ),
  });

  logQrStateTransition({
    organizationId: organization.id,
    instanceName:
      organization.qrSessionId ?? organization.evolutionInstanceName ?? null,
    source: "provider_failure",
    previousStatus: organization.qrStatus,
    nextStatus: updatedOrganization.qrStatus,
    previousReason: getQrDisconnectReason(organization.settings),
    nextReason,
    previousConnected: organization.qrConnected,
    nextConnected: updatedOrganization.qrConnected,
    providerMessage: message,
  });

  return updatedOrganization;
}

async function cleanupStaleEvolutionInstancesForOrg(
  organizationId: string,
  keepInstanceName?: string | null,
) {
  const cleanup = await cleanupStaleEvolutionInstancesForOrganization({
    organizationId,
    keepInstanceName,
  });

  if (cleanup.deleted.length > 0 || cleanup.failed.length > 0) {
    console.info("Evolution stale instance cleanup finished.", {
      organizationId,
      deleted: cleanup.deleted,
      failed: cleanup.failed,
    });
  }

  return cleanup;
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
    where: {
      organizationId,
      NOT: {
        text: "Unsupported message type",
        messageType: null,
      },
    },
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

  return getStoredWhatsAppMessageLogs(organization.id);
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
  const canReuseStoredInstance =
    normalizeQrStatus(organization.qrStatus) === "connected" ||
    normalizeQrStatus(organization.qrStatus) === "pending";
  let instanceName = canReuseStoredInstance
    ? (organization.qrSessionId ??
        organization.evolutionInstanceName ??
        buildEvolutionInstanceName(organization.id, true))
    : buildEvolutionInstanceName(organization.id, true);

  let qrResponse;
  try {
    if (args?.forceFresh) {
      try {
        await disconnectWhatsAppQrSession({ instanceName });
      } catch (error) {
        console.warn(
          "Could not fully disconnect the previous Evolution instance before starting a fresh QR.",
          error,
        );
      }

      instanceName = buildEvolutionInstanceName(organization.id, true);
    }

    if (!canReuseStoredInstance || args?.forceFresh) {
      await cleanupStaleEvolutionInstancesForOrg(organization.id, instanceName);
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
    settings: mergeQrDisconnectReason(
      organization.settings,
      qrResponse.qrStatus === "connected"
        ? null
        : qrResponse.qrStatus === "expired"
          ? "qr_expired"
          : qrResponse.qrStatus === "failed"
            ? "provider_error"
          : null,
    ),
  });

  logQrStateTransition({
    organizationId: organization.id,
    instanceName:
      updatedOrganization.qrSessionId ??
      updatedOrganization.evolutionInstanceName ??
      instanceName,
    source: "start_handshake",
    previousStatus: organization.qrStatus,
    nextStatus: updatedOrganization.qrStatus,
    previousReason: getQrDisconnectReason(organization.settings),
    nextReason: getQrDisconnectReason(updatedOrganization.settings),
    previousConnected: organization.qrConnected,
    nextConnected: updatedOrganization.qrConnected,
    providerMessage: qrResponse.errorMessage ?? null,
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
  const disconnectedByProvider =
    organization.qrConnected && !isConnected && nextQrStatus !== "pending";

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
    qrLastError: disconnectedByProvider
      ? "WhatsApp was disconnected from the phone or Linked Devices. Start a fresh QR to reconnect."
      : qrResponse.errorMessage ?? null,
    apiPhoneNumber: qrResponse.apiPhoneNumber ?? organization.apiPhoneNumber,
    apiMessagingLimit:
      qrResponse.apiMessagingLimit ?? organization.apiMessagingLimit,
    settings: mergeQrDisconnectReason(
      organization.settings,
      isConnected
        ? null
        : nextQrStatus === "expired"
          ? "qr_expired"
          : disconnectedByProvider
            ? "linked_device_lost"
            : nextQrStatus === "failed"
              ? "provider_error"
              : "disconnected",
    ),
  });

  logQrStateTransition({
    organizationId: organization.id,
    instanceName:
      updatedOrganization.qrSessionId ??
      updatedOrganization.evolutionInstanceName ??
      instanceName,
    source: "refresh_status",
    previousStatus: organization.qrStatus,
    nextStatus: updatedOrganization.qrStatus,
    previousReason: getQrDisconnectReason(organization.settings),
    nextReason: getQrDisconnectReason(updatedOrganization.settings),
    previousConnected: organization.qrConnected,
    nextConnected: updatedOrganization.qrConnected,
    providerMessage: updatedOrganization.qrLastError,
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
  if (!organization) {
    throw new HttpError(404, "Organization not found.");
  }

  const send = await sendOrganizationWhatsAppTextMessage({
    organization,
    phoneNumber: args.phoneNumber,
    message: args.message,
  });

  await prisma.whatsAppMessageLog.create({
    data: {
      organizationId: organization.id,
      instanceName: send.instanceName,
      direction: "outbound",
      to: args.phoneNumber,
      messageType: "conversation",
      text: args.message,
      status: send.result.status ?? "SENT",
      source: "app",
      providerEvent: "test_message",
      providerMessageId: send.result.providerMessageId,
      rawPayload: {
        provider: send.provider,
        phoneNumberId: send.phoneNumberId,
        providerResponse: send.result.rawResponse,
      } as any,
    },
  });

  return { success: true };
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
  let disconnectErrorMessage: string | null = null;
  if (instanceName) {
    try {
      await disconnectWhatsAppQrSession({ instanceName });
    } catch (error) {
      disconnectErrorMessage = getErrorMessage(error);
      console.warn(
        "Could not fully disconnect Evolution instance; clearing QuicReply session state anyway.",
        error,
      );
    }
  }

  const nextMode =
    normalizeApiStatus(organization.apiStatus) === "approved" ? "api" : "qr";
  const nextReason: QrDisconnectReason = "manual_disconnect";

  const updatedOrganization = await upsertOrganization(userId, {
    whatsappMode: nextMode,
    qrConnected: false,
    qrStatus: "disconnected",
    qrCodeData: null,
    qrSessionId: null,
    qrLastSeen: null,
    qrStatusCheckedAt: new Date(),
    qrDeviceInfo: null,
    evolutionInstanceName: null,
    evolutionInstanceId: null,
    qrLastError: null,
    settings: {
      ...mergeQrDisconnectReason(organization.settings, nextReason),
      ...(disconnectErrorMessage
        ? {
            whatsappQrProviderWarning: {
              message: disconnectErrorMessage,
              instanceName,
              occurredAt: new Date().toISOString(),
            },
          }
        : {}),
    },
  });

  logQrStateTransition({
    organizationId: organization.id,
    instanceName,
    source: "manual_disconnect",
    previousStatus: organization.qrStatus,
    nextStatus: updatedOrganization.qrStatus,
    previousReason: getQrDisconnectReason(organization.settings),
    nextReason,
    previousConnected: organization.qrConnected,
    nextConnected: updatedOrganization.qrConnected,
    providerMessage: disconnectErrorMessage,
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

  await prisma.$transaction(async (tx) => {
    await tx.organization.upsert({
      where: { userId },
      update: {
        whatsappMode: organization?.whatsappMode ?? "qr",
        apiStatus: "pending",
        apiPhoneNumber:
          args.apiPhoneNumber || organization?.apiPhoneNumber || null,
        apiMessagingLimit:
          organization?.apiMessagingLimit ?? "10,000+ msgs/day after approval",
        settings: mergeApiSetupRequestSettings(
          organization?.settings,
          args,
        ) as any,
      },
      create: {
        userId,
        whatsappMode: "qr",
        apiStatus: "pending",
        apiPhoneNumber: args.apiPhoneNumber || null,
        apiMessagingLimit: "10,000+ msgs/day after approval",
        settings: mergeApiSetupRequestSettings(null, args) as any,
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

export const beginOfficialApiEmbeddedSignup = async (
  _rawArgs: unknown,
  context: any,
): Promise<WhatsAppWorkspaceState> => {
  const userId = ensureUserId(context);
  const organization = await ensureOrganizationForUser(userId);
  const sessionId = crypto.randomUUID();
  const state = crypto.randomUUID();
  const appId = process.env.META_WHATSAPP_APP_ID?.trim() || null;
  const configurationId =
    process.env.META_WHATSAPP_CONFIG_ID?.trim() || null;
  const configurationError =
    !appId || !configurationId
      ? "Meta Embedded Signup is not configured yet. Set META_WHATSAPP_APP_ID and META_WHATSAPP_CONFIG_ID before launching the live flow."
      : null;

  const updatedOrganization = await upsertOrganization(userId, {
    settings: mergeEmbeddedSignupSettings(organization.settings, {
      status: configurationError ? "failed" : "session_prepared",
      sessionId,
      state,
      appId,
      configurationId,
      lastError: configurationError,
      startedAt: new Date().toISOString(),
      authorizationCodeReceivedAt: null,
      completedAt: null,
    }),
  });

  return toWorkspaceState(updatedOrganization);
};

export const saveOfficialApiEmbeddedSignupAssets = async (
  rawArgs: unknown,
  context: any,
): Promise<WhatsAppWorkspaceState> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    saveOfficialApiEmbeddedSignupAssetsArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);
  const nextSettings = mergeEmbeddedSignupSettings(organization.settings, {
    status: "assets_captured",
    businessPortfolioId:
      args.businessPortfolioId?.trim() ||
      args.businessManagerId?.trim() ||
      null,
    wabaId: args.wabaId?.trim() || null,
    phoneNumberId: args.phoneNumberId?.trim() || null,
    lastError: null,
    completedAt: new Date().toISOString(),
  });

  const updatedOrganization = await upsertOrganization(userId, {
    apiPhoneNumber: args.apiPhoneNumber?.trim() || organization.apiPhoneNumber,
    settings: mergeApiSetupRequestSettings(nextSettings, {
      businessManagerId: args.businessManagerId,
      businessPortfolioId:
        args.businessPortfolioId || args.businessManagerId || undefined,
      metaBusinessName: args.metaBusinessName,
      displayName: args.displayName,
      wabaId: args.wabaId,
      phoneNumberId: args.phoneNumberId,
      apiPhoneNumber: args.apiPhoneNumber,
    }),
  });

  return toWorkspaceState(updatedOrganization);
};

export const completeOfficialApiEmbeddedSignupSession = async (
  rawArgs: unknown,
  context: any,
): Promise<WhatsAppWorkspaceState> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    completeOfficialApiEmbeddedSignupSessionArgsSchema,
    rawArgs,
  );
  const organization = await ensureOrganizationForUser(userId);
  const completedAt = new Date().toISOString();
  const receivedAt = new Date().toISOString();
  let provisioningError: string | null = null;
  let nextApiStatus: "pending" | "approved" = "pending";
  let nextWhatsappMode = organization.whatsappMode ?? "qr";

  if (!args.wabaId?.trim() || !args.phoneNumberId?.trim()) {
    provisioningError =
      "Embedded Signup returned without the WABA ID or phone number ID required for Cloud API activation.";
  } else {
    try {
      await subscribeMetaAppToWaba({
        wabaId: args.wabaId.trim(),
      });
      nextApiStatus = "approved";
      nextWhatsappMode = organization.qrConnected ? "both" : "api";
    } catch (error) {
      provisioningError =
        error instanceof Error && error.message
          ? error.message
          : "Meta app subscription failed after Embedded Signup linked the workspace.";
    }
  }

  const nextSettings = mergeEmbeddedSignupSettings(organization.settings, {
    status: "linked",
    businessPortfolioId:
      args.businessPortfolioId?.trim() ||
      args.businessManagerId?.trim() ||
      null,
    wabaId: args.wabaId?.trim() || null,
    phoneNumberId: args.phoneNumberId?.trim() || null,
    lastError: provisioningError,
    authorizationCodeReceivedAt: receivedAt,
    completedAt,
  });

  const metaCloudApiSettings = mergeMetaCloudApiSettings(nextSettings, {
    wabaId: args.wabaId?.trim() || null,
    phoneNumberId: args.phoneNumberId?.trim() || null,
    appSubscribedAt: nextApiStatus === "approved" ? completedAt : null,
    lastProvisioningError: provisioningError,
  });

  const updatedOrganization = await upsertOrganization(userId, {
    whatsappMode: nextWhatsappMode,
    apiStatus: nextApiStatus,
    apiPhoneNumber: args.apiPhoneNumber?.trim() || organization.apiPhoneNumber,
    settings: {
      ...mergeApiSetupRequestSettings(metaCloudApiSettings, {
        businessManagerId: args.businessManagerId,
        businessPortfolioId:
          args.businessPortfolioId || args.businessManagerId || undefined,
        metaBusinessName: args.metaBusinessName,
        displayName: args.displayName,
        wabaId: args.wabaId,
        phoneNumberId: args.phoneNumberId,
        apiPhoneNumber: args.apiPhoneNumber,
      }),
      whatsappEmbeddedSignupCode: {
        value: args.code,
        receivedAt,
      },
    },
  });

  return toWorkspaceState(updatedOrganization);
};
