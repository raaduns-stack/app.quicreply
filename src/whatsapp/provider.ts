import QRCode from "qrcode";
import { HttpError, env } from "wasp/server";
import {
  getMockWhatsAppQrStatus,
  startMockWhatsAppQrSession,
  type WhatsAppQrStatus,
} from "./mockQr";

export type { WhatsAppQrStatus } from "./mockQr";

export type WhatsAppQrSessionResponse = {
  sessionId: string | null;
  qrCodeData: string | null;
  qrStatus: WhatsAppQrStatus;
  deviceInfo: string | null;
  lastSeen: Date | null;
  apiPhoneNumber: string | null;
  apiMessagingLimit: string | null;
  evolutionInstanceName?: string | null;
  evolutionInstanceId?: string | null;
  errorMessage?: string | null;
};

export type WhatsAppMessageLog = {
  id: string;
  direction: "inbound" | "outbound";
  from: string | null;
  to: string | null;
  pushName: string | null;
  messageType: string | null;
  text: string;
  timestamp: string | null;
  status: string | null;
  source: string | null;
};

export type WhatsAppSendMessageResult = {
  success: true;
  providerMessageId: string | null;
  status: string | null;
  rawResponse: unknown;
};

type EvolutionProviderInput = {
  instanceName: string;
};

const EVOLUTION_INTEGRATION = "WHATSAPP-BAILEYS";
const EVOLUTION_QR_RETRY_DELAY_MS = 1_500;
const EVOLUTION_AUTH_ERROR_MESSAGE =
  "Evolution API rejected the request. Please verify EVOLUTION_API_KEY.";
const QUICREPLY_PRODUCTION_URL = "https://app.quicreply.io";

const QR_IMAGE_KEYS = [
  "base64",
  "qrCodeData",
  "qrCodeBase64",
  "base64Qr",
  "base64QRCode",
  "qrcodeBase64",
  "qrImage",
  "image",
  "url",
];

const QR_PAYLOAD_KEYS = ["code", "qr", "qrcode", "qrCode", "pairingCode"];

function getWhatsAppProvider() {
  const provider =
    env.WHATSAPP_PROVIDER ??
    (process.env.NODE_ENV === "production" ? "evolution" : "mock");

  if (process.env.NODE_ENV === "production" && provider === "mock") {
    throw new HttpError(
      500,
      "Mock WhatsApp provider is disabled in production. Set WHATSAPP_PROVIDER=evolution.",
    );
  }

  return provider;
}

function normalizeBaseUrl(value: string | undefined) {
  return value?.replace(/\/+$/, "");
}

function getEvolutionConfig() {
  const baseUrl = normalizeBaseUrl(env.EVOLUTION_API_BASE_URL);
  const apiKey = env.EVOLUTION_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new HttpError(
      500,
      "Evolution API is not configured. Set EVOLUTION_API_BASE_URL and EVOLUTION_API_KEY, or use WHATSAPP_PROVIDER=mock.",
    );
  }

  return { baseUrl, apiKey };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function findFirstStringByKeys(value: unknown, keys: string[]): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && item.trim()) {
        return item;
      }

      const foundValue = findFirstStringByKeys(item, keys);
      if (foundValue) {
        return foundValue;
      }
    }
  }

  const record = asRecord(value);

  if (!record) {
    return null;
  }

  for (const key of keys) {
    const directValue = record[key];
    if (typeof directValue === "string" && directValue.trim()) {
      return directValue;
    }
  }

  for (const nestedValue of Object.values(record)) {
    const foundValue = findFirstStringByKeys(nestedValue, keys);
    if (foundValue) {
      return foundValue;
    }
  }

  return null;
}

function getEvolutionMessage(value: unknown) {
  return findFirstStringByKeys(value, ["message", "error", "response"]);
}

function getHttpErrorStatus(error: unknown) {
  const record = asRecord(error);
  if (!record) {
    return null;
  }

  for (const candidate of [
    record.providerStatus,
    record.evolutionStatus,
    record.statusCode,
    record.status,
    record.code,
  ]) {
    if (typeof candidate === "number") {
      return candidate;
    }

    if (typeof candidate === "string" && /^\d+$/.test(candidate)) {
      return Number(candidate);
    }
  }

  return null;
}

function getSafeEvolutionErrorStatus(status: number) {
  if (status === 401 || status === 403 || status >= 500) {
    return 502;
  }

  return status;
}

function getSafeEvolutionErrorMessage(status: number, body: unknown) {
  if (status === 401 || status === 403) {
    return EVOLUTION_AUTH_ERROR_MESSAGE;
  }

  return (
    getEvolutionMessage(body) ??
    `Evolution API request failed with status ${status}.`
  );
}

function looksLikeImageSource(value: string) {
  return (
    value.startsWith("data:image") ||
    /^https?:\/\//i.test(value) ||
    (value.length > 100 && /^[A-Za-z0-9+/=]+$/.test(value))
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function normalizeQrCodeData(response: unknown): Promise<string | null> {
  const imageLikeValue = findFirstStringByKeys(response, QR_IMAGE_KEYS);

  if (imageLikeValue && looksLikeImageSource(imageLikeValue)) {
    return imageLikeValue;
  }

  const qrPayload = findFirstStringByKeys(response, QR_PAYLOAD_KEYS);

  if (!qrPayload) {
    return null;
  }

  return QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 8,
    color: {
      dark: "#FF981F",
      light: "#FFFFFF",
    },
  });
}

function normalizeEvolutionState(value: unknown): WhatsAppQrStatus {
  const rawState =
    findFirstStringByKeys(value, ["state", "status", "connectionStatus"]) ?? "";
  const state = rawState.toLowerCase();

  if (
    state.includes("open") ||
    state.includes("connected") ||
    state.includes("online")
  ) {
    return "connected";
  }

  if (
    state.includes("connecting") ||
    state.includes("pending") ||
    state.includes("qrcode") ||
    state.includes("qr")
  ) {
    return "pending";
  }

  if (state.includes("expired")) {
    return "expired";
  }

  if (state.includes("fail") || state.includes("error")) {
    return "failed";
  }

  return "disconnected";
}

function extractEvolutionInstanceId(value: unknown) {
  return findFirstStringByKeys(value, ["instanceId", "id"]);
}

function getEvolutionInstanceRecord(
  value: unknown,
  instanceName: string,
): Record<string, unknown> | null {
  const records = Array.isArray(value) ? value : unwrapEvolutionRecords(value);

  for (const item of records) {
    const record = asRecord(item);
    const instance = asRecord(record?.instance) ?? record;
    const name = findFirstStringByKeys(instance, ["instanceName"]);

    if (name === instanceName) {
      return instance;
    }
  }

  return null;
}

function normalizeEvolutionOwner(value: string | null) {
  if (!value) {
    return null;
  }

  const digits = value
    .replace(/@s\.whatsapp\.net|@c\.us|@g\.us/gi, "")
    .replace(/\D/g, "");

  return digits ? `+${digits}` : value;
}

function getEvolutionDeviceInfo(value: unknown, instanceName: string) {
  const instance = getEvolutionInstanceRecord(value, instanceName);
  if (!instance) {
    return null;
  }

  const profileName = findFirstStringByKeys(instance, ["profileName"]);
  const owner = normalizeEvolutionOwner(
    findFirstStringByKeys(instance, ["owner", "wuid"]),
  );

  if (profileName && owner) {
    return `${profileName} · ${owner}`;
  }

  return profileName ?? owner;
}

async function evolutionRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { baseUrl, apiKey } = getEvolutionConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      apikey: apiKey,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const body = text ? safelyParseJson(text) : null;

  if (!response.ok) {
    const message = getSafeEvolutionErrorMessage(response.status, body);
    const error = new HttpError(
      getSafeEvolutionErrorStatus(response.status),
      message,
    ) as Error & {
      provider?: "evolution";
      providerStatus?: number;
      evolutionStatus?: number;
    };
    error.provider = "evolution";
    error.providerStatus = response.status;
    error.evolutionStatus = response.status;
    throw error;
  }

  return body as T;
}

async function tryEvolutionRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T | { ok: false; error: unknown; status: number | null }> {
  try {
    return await evolutionRequest<T>(path, options);
  } catch (error) {
    return {
      ok: false,
      error,
      status: getHttpErrorStatus(error),
    };
  }
}

function isFailedEvolutionAttempt(
  value: unknown,
): value is { ok: false; error: unknown; status: number | null } {
  return (
    value !== null &&
    typeof value === "object" &&
    "ok" in value &&
    (value as { ok?: unknown }).ok === false
  );
}

function safelyParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function normalizePhoneNumber(value: string) {
  const normalizedValue = value.replace(/[^\d]/g, "");

  if (normalizedValue.length < 8 || normalizedValue.length > 20) {
    throw new HttpError(
      400,
      "Enter a valid WhatsApp number with country code before sending.",
    );
  }

  return normalizedValue;
}

function getProviderMessageId(value: unknown) {
  const record = asRecord(value);
  const key = asRecord(record?.key);

  return (
    findFirstStringByKeys(key, ["id"]) ??
    findFirstStringByKeys(record, ["messageId", "id"])
  );
}

function getProviderMessageStatus(value: unknown) {
  return findFirstStringByKeys(value, ["status"]);
}

function getTimestampIso(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    const milliseconds = value < 10_000_000_000 ? value * 1000 : value;
    return new Date(milliseconds).toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    const parsedNumber = Number(value);
    if (!Number.isNaN(parsedNumber)) {
      return getTimestampIso(parsedNumber);
    }

    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
  }

  return null;
}

function extractMessageText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  const record = asRecord(value);
  if (!record) {
    return "";
  }

  const message = asRecord(record.message) ?? record;
  const directText = findFirstStringByKeys(message, [
    "conversation",
    "text",
    "body",
    "caption",
    "message",
  ]);

  if (directText) {
    return directText;
  }

  for (const nestedKey of [
    "extendedTextMessage",
    "imageMessage",
    "videoMessage",
    "documentMessage",
  ]) {
    const nestedText = findFirstStringByKeys(message[nestedKey], [
      "text",
      "caption",
    ]);
    if (nestedText) {
      return nestedText;
    }
  }

  return "Unsupported message type";
}

function unwrapEvolutionRecords(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const record = asRecord(value);
  if (!record) {
    return [];
  }

  for (const key of ["records", "messages", "data", "response", "items"]) {
    const nestedValue = record[key];
    if (Array.isArray(nestedValue)) {
      return nestedValue;
    }

    const nestedRecord = asRecord(nestedValue);
    if (nestedRecord) {
      const unwrappedNested = unwrapEvolutionRecords(nestedRecord);
      if (unwrappedNested.length > 0) {
        return unwrappedNested;
      }
    }
  }

  return [];
}

function normalizeMessageLogs(
  response: unknown,
  limit: number,
): WhatsAppMessageLog[] {
  const logs = unwrapEvolutionRecords(response).map((rawItem, index) => {
    const item = asRecord(rawItem) ?? {};
    const key = asRecord(item.key);
    const fromMe = item.fromMe === true || key?.fromMe === true;
    const direction: WhatsAppMessageLog["direction"] = fromMe
      ? "outbound"
      : "inbound";
    const remoteJid =
      findFirstStringByKeys(key, ["remoteJid", "participant"]) ??
      findFirstStringByKeys(item, ["remoteJid", "from", "to", "sender"]);

    return {
      id:
        findFirstStringByKeys(item, ["id", "messageId"]) ??
        findFirstStringByKeys(key, ["id"]) ??
        `message-${index}`,
      direction,
      from: fromMe ? null : remoteJid,
      to: fromMe ? remoteJid : null,
      pushName: findFirstStringByKeys(item, ["pushName", "name"]),
      messageType: findFirstStringByKeys(item, ["messageType", "type"]),
      text: extractMessageText(item),
      timestamp:
        getTimestampIso(item.messageTimestamp) ??
        getTimestampIso(item.timestamp) ??
        getTimestampIso(item.createdAt),
      status: findFirstStringByKeys(item, ["status"]),
      source: findFirstStringByKeys(item, ["source"]),
    };
  });

  const seenKeys = new Set<string>();
  const uniqueLogs: WhatsAppMessageLog[] = [];

  for (const log of logs) {
    const key = [
      log.id,
      log.direction,
      log.from ?? "",
      log.to ?? "",
      log.text,
      log.timestamp ?? "",
    ].join("|");

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    uniqueLogs.push(log);
  }

  return uniqueLogs.slice(0, limit);
}

function buildMockMessageLogs(): WhatsAppMessageLog[] {
  return [
    {
      id: "mock-inbound-1",
      direction: "inbound",
      from: "+15551234567",
      to: null,
      pushName: "Sarah Johnson",
      messageType: "conversation",
      text: "Hi, is this still available?",
      timestamp: new Date().toISOString(),
      status: "RECEIVED",
      source: "mock",
    },
    {
      id: "mock-outbound-1",
      direction: "outbound",
      from: null,
      to: "+15551234567",
      pushName: "Sarah Johnson",
      messageType: "conversation",
      text: "Yes, Jennifer can help you with pricing and delivery.",
      timestamp: new Date(Date.now() - 60_000).toISOString(),
      status: "SERVER_ACK",
      source: "mock",
    },
  ];
}

async function createEvolutionInstance(input: EvolutionProviderInput) {
  try {
    return await evolutionRequest<unknown>("/instance/create", {
      method: "POST",
      body: JSON.stringify({
        instanceName: input.instanceName,
        integration: EVOLUTION_INTEGRATION,
        qrcode: true,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes("already") ||
      lowerMessage.includes("in use") ||
      getHttpErrorStatus(error) === 403
    ) {
      return null;
    }

    throw error;
  }
}

function getWebhookBaseUrl() {
  return (
    env.WHATSAPP_WEBHOOK_BASE_URL ||
    process.env.WASP_SERVER_URL ||
    process.env.WASP_WEB_CLIENT_URL ||
    (process.env.NODE_ENV === "production" ? QUICREPLY_PRODUCTION_URL : null)
  )?.replace(/\/+$/, "");
}

async function configureEvolutionWebhook(input: EvolutionProviderInput) {
  const baseUrl = getWebhookBaseUrl();
  if (!baseUrl) {
    return;
  }

  const webhookUrl = new URL(`${baseUrl}/webhooks/evolution/whatsapp`);
  if (env.WHATSAPP_INBOUND_WEBHOOK_SECRET) {
    webhookUrl.searchParams.set("secret", env.WHATSAPP_INBOUND_WEBHOOK_SECRET);
  }

  try {
    await evolutionRequest<unknown>(
      `/webhook/set/${encodeURIComponent(input.instanceName)}`,
      {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl.toString(),
            webhookByEvents: false,
            webhook_by_events: false,
            webhookBase64: false,
            webhook_base64: false,
            events: [
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "CONNECTION_UPDATE",
              "QRCODE_UPDATED",
            ],
          },
        }),
      },
    );
  } catch (error) {
    console.warn(
      "Could not configure Evolution webhook for WhatsApp instance.",
      error,
    );
  }
}

async function connectEvolutionInstance(input: EvolutionProviderInput) {
  return evolutionRequest<unknown>(
    `/instance/connect/${encodeURIComponent(input.instanceName)}`,
  );
}

async function getEvolutionConnectionState(input: EvolutionProviderInput) {
  return evolutionRequest<unknown>(
    `/instance/connectionState/${encodeURIComponent(input.instanceName)}`,
  );
}

async function fetchEvolutionInstance(input: EvolutionProviderInput) {
  return evolutionRequest<unknown>(
    `/instance/fetchInstances?instanceName=${encodeURIComponent(
      input.instanceName,
    )}`,
  );
}

async function logoutEvolutionInstance(input: EvolutionProviderInput) {
  return evolutionRequest<unknown>(
    `/instance/logout/${encodeURIComponent(input.instanceName)}`,
    { method: "DELETE" },
  );
}

async function deleteEvolutionInstance(input: EvolutionProviderInput) {
  return evolutionRequest<unknown>(
    `/instance/delete/${encodeURIComponent(input.instanceName)}`,
    { method: "DELETE" },
  );
}

export async function startWhatsAppQrSession(
  input: EvolutionProviderInput,
): Promise<WhatsAppQrSessionResponse> {
  if (getWhatsAppProvider() !== "evolution") {
    return startMockWhatsAppQrSession();
  }

  const createdInstance = await createEvolutionInstance(input);
  await configureEvolutionWebhook(input);
  let connectResponse = await connectEvolutionInstance(input);
  let qrCodeData =
    (await normalizeQrCodeData(connectResponse)) ??
    (await normalizeQrCodeData(createdInstance));

  let normalizedStatus = normalizeEvolutionState(
    connectResponse ?? createdInstance,
  );

  if (!qrCodeData && normalizedStatus !== "connected") {
    await delay(EVOLUTION_QR_RETRY_DELAY_MS);
    connectResponse = await connectEvolutionInstance(input);
    qrCodeData =
      (await normalizeQrCodeData(connectResponse)) ??
      (await normalizeQrCodeData(createdInstance));
    normalizedStatus = normalizeEvolutionState(connectResponse);
  }

  const qrStatus =
    qrCodeData || normalizedStatus === "disconnected"
      ? "pending"
      : normalizedStatus;

  const instanceResponse =
    qrStatus === "connected" ? await fetchEvolutionInstance(input) : null;

  return {
    sessionId: input.instanceName,
    qrCodeData,
    qrStatus,
    deviceInfo:
      qrStatus === "connected"
        ? getEvolutionDeviceInfo(instanceResponse, input.instanceName)
        : null,
    lastSeen: qrStatus === "connected" ? new Date() : null,
    apiPhoneNumber: null,
    apiMessagingLimit: null,
    evolutionInstanceName: input.instanceName,
    evolutionInstanceId: extractEvolutionInstanceId(createdInstance),
    errorMessage:
      qrStatus === "pending" && !qrCodeData
        ? "Evolution instance is preparing the QR code. Keep this page open; we will refresh automatically."
        : null,
  };
}

export async function refreshWhatsAppQrSessionStatus(
  input: EvolutionProviderInput,
): Promise<WhatsAppQrSessionResponse> {
  if (getWhatsAppProvider() !== "evolution") {
    return getMockWhatsAppQrStatus(input.instanceName);
  }

  await configureEvolutionWebhook(input);
  const statusResponse = await getEvolutionConnectionState(input);
  let qrStatus = normalizeEvolutionState(statusResponse);
  let qrCodeData: string | null = null;

  if (qrStatus !== "connected") {
    try {
      const connectResponse = await connectEvolutionInstance(input);
      qrCodeData = await normalizeQrCodeData(connectResponse);
      qrStatus =
        qrCodeData || qrStatus === "disconnected"
          ? "pending"
          : normalizeEvolutionState(connectResponse);
    } catch (error) {
      const statusCode = getHttpErrorStatus(error);
      if (statusCode !== 400 && statusCode !== 403 && statusCode !== 404) {
        throw error;
      }
    }
  }

  const isConnected = qrStatus === "connected";

  const instanceResponse = isConnected
    ? await fetchEvolutionInstance(input)
    : null;

  return {
    sessionId: input.instanceName,
    qrCodeData,
    qrStatus,
    deviceInfo: isConnected
      ? getEvolutionDeviceInfo(instanceResponse, input.instanceName)
      : null,
    lastSeen: isConnected ? new Date() : null,
    apiPhoneNumber: null,
    apiMessagingLimit: null,
    evolutionInstanceName: input.instanceName,
    evolutionInstanceId: extractEvolutionInstanceId(statusResponse),
    errorMessage:
      qrStatus === "pending" && !qrCodeData
        ? "Evolution instance is preparing the QR code. Keep this page open; we will refresh automatically."
        : null,
  };
}

export async function disconnectWhatsAppQrSession(
  input: EvolutionProviderInput,
) {
  if (getWhatsAppProvider() !== "evolution") {
    return;
  }

  await ignoreMissingEvolutionInstance(() => logoutEvolutionInstance(input));
  await ignoreMissingEvolutionInstance(() => deleteEvolutionInstance(input));
}

export async function fetchWhatsAppMessageLogs(
  input: EvolutionProviderInput & { limit?: number },
): Promise<WhatsAppMessageLog[]> {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);

  if (getWhatsAppProvider() !== "evolution") {
    return buildMockMessageLogs().slice(0, limit);
  }

  const response = await evolutionRequest<unknown>(
    `/chat/findMessages/${encodeURIComponent(input.instanceName)}`,
    {
      method: "POST",
      body: JSON.stringify({
        where: {},
        limit,
      }),
    },
  );

  return normalizeMessageLogs(response, limit);
}

export async function sendWhatsAppTestMessage(
  input: EvolutionProviderInput & { phoneNumber: string; message: string },
): Promise<WhatsAppSendMessageResult> {
  const text = input.message.trim();
  if (!text) {
    throw new HttpError(400, "Enter a test message before sending.");
  }

  if (getWhatsAppProvider() !== "evolution") {
    return {
      success: true,
      providerMessageId: null,
      status: "MOCK",
      rawResponse: null,
    };
  }

  const number = normalizePhoneNumber(input.phoneNumber);
  const path = `/message/sendText/${encodeURIComponent(input.instanceName)}`;
  const plainTextResponse = await tryEvolutionRequest<unknown>(path, {
    method: "POST",
    body: JSON.stringify({
      number,
      text,
      linkPreview: false,
    }),
  });

  let response: unknown = plainTextResponse;

  if (isFailedEvolutionAttempt(plainTextResponse)) {
    if (plainTextResponse.status !== 400) {
      throw plainTextResponse.error;
    }

    response = await evolutionRequest<unknown>(path, {
      method: "POST",
      body: JSON.stringify({
        number,
        textMessage: { text },
        linkPreview: false,
      }),
    });
  }

  return {
    success: true,
    providerMessageId: getProviderMessageId(response),
    status: getProviderMessageStatus(response),
    rawResponse: response,
  };
}

export async function sendWhatsAppTextMessage(
  input: EvolutionProviderInput & { phoneNumber: string; message: string },
) {
  return sendWhatsAppTestMessage(input);
}

async function ignoreMissingEvolutionInstance(request: () => Promise<unknown>) {
  try {
    await request();
  } catch (error) {
    const statusCode = getHttpErrorStatus(error);
    if (statusCode !== 400 && statusCode !== 403 && statusCode !== 404) {
      throw error;
    }
  }
}
