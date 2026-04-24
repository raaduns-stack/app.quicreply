import { HttpError, env } from "wasp/server";

export const whatsappQrStatusValues = [
  "disconnected",
  "pending",
  "connected",
  "expired",
  "failed",
] as const;

export type WhatsAppQrStatus = (typeof whatsappQrStatusValues)[number];

type N8nNormalizedResponse = {
  sessionId: string | null;
  qrCodeData: string | null;
  qrStatus: WhatsAppQrStatus;
  deviceInfo: string | null;
  lastSeen: Date | null;
  apiPhoneNumber: string | null;
  apiMessagingLimit: string | null;
};

function ensureConfiguredUrl(url: string, label: string) {
  if (!url) {
    throw new HttpError(500, `${label} is not configured on the server.`);
  }
}

function buildHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (env.N8N_WHATSAPP_AUTH_HEADER_NAME && env.N8N_WHATSAPP_AUTH_HEADER_VALUE) {
    headers[env.N8N_WHATSAPP_AUTH_HEADER_NAME] = env.N8N_WHATSAPP_AUTH_HEADER_VALUE;
  }

  return headers;
}

function getCandidateValues(source: unknown, keys: string[]): unknown[] {
  if (!source || typeof source !== "object") {
    return [];
  }

  const record = source as Record<string, unknown>;
  const values: unknown[] = keys
    .map((key) => record[key])
    .filter((value) => value !== undefined && value !== null);

  if (record.data && typeof record.data === "object") {
    values.push(...getCandidateValues(record.data, keys));
  }

  return values;
}

function getStringValue(source: unknown, keys: string[]): string | null {
  for (const value of getCandidateValues(source, keys)) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getDateValue(source: unknown, keys: string[]): Date | null {
  const rawValue = getStringValue(source, keys);
  if (!rawValue) {
    return null;
  }

  const date = new Date(rawValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeQrStatus(rawValue: string | null): WhatsAppQrStatus {
  const value = rawValue?.trim().toLowerCase();

  if (!value) {
    return "pending";
  }

  if (["connected", "active", "ready", "authenticated", "success"].includes(value)) {
    return "connected";
  }
  if (["expired", "timeout"].includes(value)) {
    return "expired";
  }
  if (["failed", "error", "invalid"].includes(value)) {
    return "failed";
  }
  if (["disconnected", "offline"].includes(value)) {
    return "disconnected";
  }

  return "pending";
}

async function parseN8nResponse(response: Response): Promise<N8nNormalizedResponse> {
  let json: unknown;

  try {
    json = await response.json();
  } catch {
    throw new HttpError(502, "n8n returned an invalid JSON response.");
  }

  const sessionId = getStringValue(json, [
    "sessionId",
    "session_id",
    "instanceId",
    "instance_id",
    "id",
  ]);
  const qrCodeData = getStringValue(json, [
    "qrCodeData",
    "qrCode",
    "qr",
    "qrImage",
    "qr_image",
    "base64",
    "image",
    "imageUrl",
  ]);

  return {
    sessionId,
    qrCodeData,
    qrStatus: normalizeQrStatus(
      getStringValue(json, [
        "qrStatus",
        "status",
        "connectionStatus",
        "connection_status",
      ]),
    ),
    deviceInfo: getStringValue(json, ["qrDeviceInfo", "deviceInfo", "device", "deviceName"]),
    lastSeen: getDateValue(json, ["qrLastSeen", "lastSeen", "last_seen"]),
    apiPhoneNumber: getStringValue(json, ["apiPhoneNumber", "phoneNumber", "phone"]),
    apiMessagingLimit: getStringValue(json, [
      "apiMessagingLimit",
      "messagingLimit",
      "messaging_limit",
      "limit",
    ]),
  };
}

export async function startN8nWhatsAppQrSession(payload: Record<string, unknown>) {
  ensureConfiguredUrl(
    env.N8N_WHATSAPP_QR_START_URL,
    "N8N_WHATSAPP_QR_START_URL",
  );

  const response = await fetch(env.N8N_WHATSAPP_QR_START_URL, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new HttpError(
      502,
      `n8n QR start webhook failed with status ${response.status}.`,
    );
  }

  const normalized = await parseN8nResponse(response);

  if (!normalized.sessionId || !normalized.qrCodeData) {
    throw new HttpError(
      502,
      "n8n QR start webhook did not return the required sessionId and QR payload.",
    );
  }

  return normalized;
}

export async function getN8nWhatsAppQrStatus(sessionId: string) {
  ensureConfiguredUrl(
    env.N8N_WHATSAPP_QR_STATUS_URL,
    "N8N_WHATSAPP_QR_STATUS_URL",
  );

  const response = await fetch(env.N8N_WHATSAPP_QR_STATUS_URL, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    throw new HttpError(
      502,
      `n8n QR status webhook failed with status ${response.status}.`,
    );
  }

  return parseN8nResponse(response);
}
