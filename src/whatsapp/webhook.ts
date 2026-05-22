import { HttpError, env, prisma } from "wasp/server";
import { sendWhatsAppTextMessage } from "./provider";

type WebhookSettings = {
  inboundUrl: string | null;
  enabled: boolean;
};

function normalizeSettings(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function getWebhookSettings(settings: unknown): WebhookSettings {
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

function getHeaderValue(req: any, headerName: string) {
  if (typeof req.get === "function") {
    return req.get(headerName);
  }

  const value = req.headers?.[headerName.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function validateWebhookSecret(req: any) {
  const expectedSecret = env.WHATSAPP_INBOUND_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return;
  }

  const providedSecret =
    getHeaderValue(req, "x-quicreply-webhook-secret") ?? req.query?.secret;

  if (providedSecret !== expectedSecret) {
    throw new HttpError(401, "Invalid WhatsApp webhook secret.");
  }
}

function validateN8nReplySecret(req: any) {
  const expectedSecret = env.N8N_WHATSAPP_REPLY_SECRET;
  if (!expectedSecret) {
    return;
  }

  const providedSecret =
    getHeaderValue(req, "x-quicreply-webhook-secret") ??
    getHeaderValue(req, "x-n8n-webhook-secret") ??
    req.query?.secret;

  if (providedSecret !== expectedSecret) {
    throw new HttpError(401, "Invalid n8n WhatsApp reply secret.");
  }
}

function getStringAtPath(
  payload: Record<string, unknown>,
  path: string[],
): string | null {
  let current: unknown = payload;

  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" && current.trim() ? current : null;
}

function getNestedValue(payload: unknown, path: string[]): unknown {
  let current = payload;

  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function findFirstStringByPaths(
  payload: Record<string, unknown>,
  paths: string[][],
): string | null {
  for (const path of paths) {
    const value = getStringAtPath(payload, path);
    if (value) {
      return value;
    }
  }

  return null;
}

function getNumberAtPath(
  payload: Record<string, unknown>,
  path: string[],
): number | null {
  const value = getNestedValue(payload, path);

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const low = record.low;

    if (typeof low === "number" && Number.isFinite(low)) {
      return low;
    }

    if (typeof low === "string" && low.trim()) {
      const parsedLow = Number(low);
      return Number.isFinite(parsedLow) ? parsedLow : null;
    }
  }

  return null;
}

function findFirstNumberByPaths(
  payload: Record<string, unknown>,
  paths: string[][],
): number | null {
  for (const path of paths) {
    const value = getNumberAtPath(payload, path);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function normalizeUnixTimestamp(value: number | null) {
  if (!value) {
    return null;
  }

  const timestampMs = value > 1_000_000_000_000 ? value : value * 1000;
  const date = new Date(timestampMs);

  return Number.isNaN(date.getTime()) ? null : date;
}

function extractProviderMessageDate(payload: Record<string, unknown>) {
  return normalizeUnixTimestamp(
    findFirstNumberByPaths(payload, [
      ["data", "messageTimestamp"],
      ["messageTimestamp"],
      ["data", "message", "messageTimestamp"],
      ["message", "messageTimestamp"],
      ["data", "key", "messageTimestamp"],
      ["key", "messageTimestamp"],
      ["data", "timestamp"],
      ["timestamp"],
    ]),
  );
}

function shouldCountInboundAsUnread(
  direction: "inbound" | "outbound",
  date: Date | null,
) {
  if (direction !== "inbound") {
    return false;
  }

  if (!date) {
    return true;
  }

  const now = Date.now();
  const eventTime = date.getTime();
  const sixHoursMs = 6 * 60 * 60 * 1000;
  const fiveMinutesMs = 5 * 60 * 1000;

  return eventTime >= now - sixHoursMs && eventTime <= now + fiveMinutesMs;
}

function extractInstanceName(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const directMatch =
    getStringAtPath(record, ["instance"]) ??
    getStringAtPath(record, ["instanceName"]) ??
    getStringAtPath(record, ["instanceId"]) ??
    getStringAtPath(record, ["data", "instance"]) ??
    getStringAtPath(record, ["data", "instanceName"]) ??
    getStringAtPath(record, ["instance", "instanceName"]) ??
    getStringAtPath(record, ["instance", "name"]) ??
    getStringAtPath(record, ["instance", "id"]);

  return directMatch?.trim() ?? null;
}

async function findOrganizationByInstance(instanceName: string) {
  return prisma.organization.findFirst({
    where: {
      OR: [
        { evolutionInstanceName: instanceName },
        { evolutionInstanceId: instanceName },
        { qrSessionId: instanceName },
      ],
    },
    select: {
      id: true,
      settings: true,
      isAiActive: true,
      evolutionInstanceName: true,
      evolutionInstanceId: true,
      qrSessionId: true,
      qrConnected: true,
      qrStatus: true,
    },
  });
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractMessageRecord(
  payload: Record<string, unknown>,
): Record<string, unknown> | null {
  return (
    getRecord(getNestedValue(payload, ["data", "message"])) ??
    getRecord(getNestedValue(payload, ["message"]))
  );
}

function extractMessageType(payload: Record<string, unknown>) {
  return (
    findFirstStringByPaths(payload, [
      ["data", "messageType"],
      ["messageType"],
      ["data", "type"],
      ["type"],
    ]) ?? null
  );
}

function getMediaFallbackLabel(messageType: string | null) {
  switch (messageType) {
    case "imageMessage":
      return "Image message";
    case "videoMessage":
      return "Video message";
    case "audioMessage":
      return "Voice message";
    case "documentMessage":
      return "Document message";
    case "stickerMessage":
      return "Sticker";
    case "locationMessage":
      return "Location shared";
    case "contactsArrayMessage":
    case "contactMessage":
      return "Contact shared";
    default:
      return null;
  }
}

function extractInboundMessageText(
  payload: Record<string, unknown>,
  messageType: string | null,
) {
  const directText = findFirstStringByPaths(payload, [
    ["data", "message", "conversation"],
    ["data", "message", "extendedTextMessage", "text"],
    ["data", "message", "imageMessage", "caption"],
    ["data", "message", "videoMessage", "caption"],
    ["data", "message", "documentMessage", "caption"],
    ["message", "conversation"],
    ["message", "extendedTextMessage", "text"],
    ["message", "imageMessage", "caption"],
    ["message", "videoMessage", "caption"],
    ["message", "documentMessage", "caption"],
    ["data", "text"],
    ["text"],
    ["body"],
  ]);

  return directText ?? getMediaFallbackLabel(messageType);
}

function normalizeWhatsAppPhone(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const digits = value
    .replace(/@s\.whatsapp\.net|@c\.us|@g\.us/gi, "")
    .replace(/\D/g, "");

  return digits ? digits : null;
}

function extractInboundDirection(payload: Record<string, unknown>) {
  const fromMe =
    getNestedValue(payload, ["data", "key", "fromMe"]) ??
    getNestedValue(payload, ["key", "fromMe"]) ??
    payload.fromMe;

  return fromMe === true ? "outbound" : "inbound";
}

function extractInboundRemoteJid(payload: Record<string, unknown>) {
  return findFirstStringByPaths(payload, [
    ["data", "key", "remoteJid"],
    ["key", "remoteJid"],
    ["data", "remoteJid"],
    ["remoteJid"],
    ["data", "from"],
    ["from"],
    ["sender"],
  ]);
}

function extractInboundRemoteJidAlt(payload: Record<string, unknown>) {
  return findFirstStringByPaths(payload, [
    ["data", "key", "remoteJidAlt"],
    ["key", "remoteJidAlt"],
    ["data", "remoteJidAlt"],
    ["remoteJidAlt"],
  ]);
}

function isLidJid(value: string | null | undefined) {
  return Boolean(value?.includes("@lid"));
}

function getContactJid(primaryJid: string | null, alternateJid: string | null) {
  if (isLidJid(primaryJid) && alternateJid) {
    return alternateJid;
  }

  return primaryJid;
}

function extractInboundMessageId(payload: Record<string, unknown>) {
  return findFirstStringByPaths(payload, [
    ["data", "key", "id"],
    ["key", "id"],
    ["data", "id"],
    ["id"],
    ["messageId"],
  ]);
}

async function createWhatsAppMessageLog({
  organizationId,
  instanceName,
  direction,
  from,
  to,
  pushName,
  messageType,
  text,
  status,
  source,
  providerEvent,
  providerMessageId,
  occurredAt,
  rawPayload,
}: {
  organizationId: string;
  instanceName: string | null;
  direction: "inbound" | "outbound";
  from?: string | null;
  to?: string | null;
  pushName?: string | null;
  messageType?: string | null;
  text?: string | null;
  status?: string | null;
  source: string;
  providerEvent?: string | null;
  providerMessageId?: string | null;
  occurredAt?: Date | null;
  rawPayload?: unknown;
}) {
  if (providerMessageId) {
    const existingLog = await prisma.whatsAppMessageLog.findFirst({
      where: {
        organizationId,
        providerMessageId,
      },
      select: { id: true },
    });

    if (existingLog) {
      return;
    }
  }

  await prisma.whatsAppMessageLog.create({
    data: {
      organizationId,
      createdAt: occurredAt ?? undefined,
      instanceName,
      direction,
      from,
      to,
      pushName,
      messageType,
      text,
      status,
      source,
      providerEvent,
      providerMessageId,
      rawPayload: rawPayload as any,
    },
  });
}

function normalizeConnectionState(payload: Record<string, unknown>) {
  const rawState =
    findFirstStringByPaths(payload, [
      ["data", "state"],
      ["data", "status"],
      ["state"],
      ["status"],
    ]) ?? "";
  const state = rawState.toLowerCase();

  if (
    state.includes("open") ||
    state.includes("connected") ||
    state.includes("online")
  ) {
    return "connected";
  }

  if (state.includes("close") || state.includes("disconnect")) {
    return "disconnected";
  }

  return null;
}

async function upsertContactFromWhatsApp({
  organizationId,
  direction,
  from,
  to,
  pushName,
  text,
  occurredAt,
  shouldIncrementUnread,
}: {
  organizationId: string;
  direction: "inbound" | "outbound";
  from?: string | null;
  to?: string | null;
  pushName?: string | null;
  text?: string | null;
  occurredAt?: Date | null;
  shouldIncrementUnread: boolean;
}) {
  const phone = normalizeWhatsAppPhone(direction === "inbound" ? from : to);

  if (!phone) {
    return;
  }

  const now = occurredAt ?? new Date();
  const safePushName = getSafeContactPushName(pushName);
  const inboundPushName = direction === "inbound" ? safePushName : null;
  const fallbackName = inboundPushName || phone;

  return prisma.contact.upsert({
    where: {
      organizationId_phone: {
        organizationId,
        phone,
      },
    },
    update: {
      name: inboundPushName || undefined,
      source: "WhatsApp",
      lastMessage: text || "Unsupported message type",
      lastMessageAt: now,
      lastMessageDirection: direction,
      resolvedAt: direction === "inbound" ? null : undefined,
      unreadCount: shouldIncrementUnread ? { increment: 1 } : undefined,
    },
    create: {
      organizationId,
      name: fallbackName,
      phone,
      source: "WhatsApp",
      status: direction === "inbound" ? "ai-active" : "human-active",
      tags: ["Interested"],
      assignedTo: "Jennifer",
      lastMessage: text || "Unsupported message type",
      lastMessageAt: now,
      lastMessageDirection: direction,
      isAiActive: true,
      unreadCount: shouldIncrementUnread ? 1 : 0,
    },
  });
}

function getSafeContactPushName(value?: string | null) {
  const name = value?.trim();

  if (!name) {
    return null;
  }

  // Evolution/Baileys can send the sender label for outbound messages as
  // "Você" ("You"). That is metadata about our own session, not the customer.
  if (["you", "você", "voce"].includes(name.toLowerCase())) {
    return null;
  }

  return name;
}

async function findOrganizationForReply(payload: Record<string, unknown>) {
  const organizationId =
    typeof payload.organizationId === "string" && payload.organizationId.trim()
      ? payload.organizationId.trim()
      : null;
  const instanceName =
    typeof payload.instanceName === "string" && payload.instanceName.trim()
      ? payload.instanceName.trim()
      : null;

  if (organizationId) {
    return prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        qrConnected: true,
        qrStatus: true,
        evolutionInstanceName: true,
        qrSessionId: true,
      },
    });
  }

  if (instanceName) {
    return prisma.organization.findFirst({
      where: {
        OR: [
          { evolutionInstanceName: instanceName },
          { qrSessionId: instanceName },
        ],
      },
      select: {
        id: true,
        qrConnected: true,
        qrStatus: true,
        evolutionInstanceName: true,
        qrSessionId: true,
      },
    });
  }

  return null;
}

function getReplyString(
  payload: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

async function forwardToN8n({
  inboundUrl,
  organizationId,
  instanceName,
  payload,
}: {
  inboundUrl: string;
  organizationId: string;
  instanceName: string;
  payload: unknown;
}) {
  const response = await fetch(inboundUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "evolution",
      organizationId,
      instanceName,
      receivedAt: new Date().toISOString(),
      payload,
    }),
  });

  if (!response.ok) {
    throw new HttpError(502, "Could not forward WhatsApp event to n8n.");
  }
}

export async function evolutionWhatsAppWebhook(
  req: any,
  res: any,
  _context: any,
) {
  validateWebhookSecret(req);

  const payload = req.body ?? {};
  const instanceName = extractInstanceName(payload);

  if (!instanceName) {
    res.status(202).json({
      ok: true,
      forwarded: false,
      reason: "instance_not_found_in_payload",
    });
    return;
  }

  const organization = await findOrganizationByInstance(instanceName);
  if (!organization) {
    res.status(202).json({
      ok: true,
      forwarded: false,
      reason: "organization_not_found",
    });
    return;
  }

  const payloadRecord =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const providerEvent =
    findFirstStringByPaths(payloadRecord, [["event"], ["data", "event"]]) ??
    "messages.upsert";
  const connectionState = normalizeConnectionState(payloadRecord);

  if (connectionState) {
    const isConnected = connectionState === "connected";
    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        qrConnected: isConnected,
        qrStatus: connectionState,
        qrCodeData: isConnected ? undefined : null,
        qrStatusCheckedAt: new Date(),
        qrLastSeen:
          isConnected
            ? new Date()
            : organization.qrConnected
              ? new Date()
              : undefined,
        qrDeviceInfo: isConnected ? undefined : null,
        qrLastError: isConnected
          ? null
          : "WhatsApp was disconnected from the phone or Linked Devices. Start a fresh QR to reconnect.",
      },
    });
  }

  const direction = extractInboundDirection(payloadRecord);
  const remoteJid = extractInboundRemoteJid(payloadRecord);
  const remoteJidAlt = extractInboundRemoteJidAlt(payloadRecord);
  const contactJid = getContactJid(remoteJid, remoteJidAlt);
  const pushName =
    findFirstStringByPaths(payloadRecord, [
      ["data", "pushName"],
      ["pushName"],
      ["data", "name"],
      ["name"],
    ]) ?? null;
  const messageType = extractMessageType(payloadRecord);
  const messageRecord = extractMessageRecord(payloadRecord);
  const messageText = extractInboundMessageText(payloadRecord, messageType);
  const occurredAt = extractProviderMessageDate(payloadRecord);
  const shouldIncrementUnread = shouldCountInboundAsUnread(
    direction,
    occurredAt,
  );

  const normalizedEvent = providerEvent.toLowerCase();
  const canonicalEvent = normalizedEvent.replace(/_/g, ".");
  const isMessageEvent =
    canonicalEvent.includes("messages.upsert") ||
    canonicalEvent.includes("send.message");

  if (!isMessageEvent || !messageRecord || !messageText) {
    res.status(202).json({
      ok: true,
      forwarded: false,
      reason: !isMessageEvent ? "non_message_event" : "message_without_body",
    });
    return;
  }

  if (contactJid?.endsWith("@g.us")) {
    res.status(202).json({
      ok: true,
      forwarded: false,
      reason: "group_message_ignored",
    });
    return;
  }

  if (direction === "inbound" && occurredAt && !shouldIncrementUnread) {
    res.status(202).json({
      ok: true,
      forwarded: false,
      reason: "stale_message_ignored",
    });
    return;
  }

  await createWhatsAppMessageLog({
    organizationId: organization.id,
    instanceName,
    direction,
    from: direction === "inbound" ? contactJid : null,
    to: direction === "outbound" ? contactJid : null,
    pushName,
    messageType,
    text: messageText,
    status:
      findFirstStringByPaths(payloadRecord, [["data", "status"], ["status"]]) ??
      "RECEIVED",
    source: "evolution",
    providerEvent,
    providerMessageId: extractInboundMessageId(payloadRecord),
    occurredAt,
    rawPayload: payload,
  });

  const contact = await upsertContactFromWhatsApp({
    organizationId: organization.id,
    direction,
    from: direction === "inbound" ? contactJid : null,
    to: direction === "outbound" ? contactJid : null,
    pushName,
    text: messageText,
    occurredAt,
    shouldIncrementUnread,
  });

  const orgWebhook = getWebhookSettings(organization.settings);
  const inboundUrl =
    orgWebhook.enabled && orgWebhook.inboundUrl
      ? orgWebhook.inboundUrl
      : env.N8N_WHATSAPP_INBOUND_WEBHOOK_URL;

  if (direction !== "inbound") {
    res.status(202).json({
      ok: true,
      forwarded: false,
      reason: "not_inbound_message",
    });
    return;
  }

  if (!organization.isAiActive) {
    res.status(202).json({
      ok: true,
      forwarded: false,
      reason: "jennifer_inactive",
    });
    return;
  }

  if (!contact || !contact.isAiActive) {
    res.status(202).json({
      ok: true,
      forwarded: false,
      reason: contact ? "contact_ai_paused" : "contact_not_found",
    });
    return;
  }

  if (!inboundUrl) {
    res.status(202).json({
      ok: true,
      forwarded: false,
      reason: "forwarding_not_configured",
    });
    return;
  }

  await forwardToN8n({
    inboundUrl,
    organizationId: organization.id,
    instanceName,
    payload,
  });

  res.json({ ok: true, forwarded: true });
}

export async function n8nWhatsAppReplyWebhook(
  req: any,
  res: any,
  _context: any,
) {
  validateN8nReplySecret(req);

  const payload =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {};
  const phoneNumber = getReplyString(payload, ["to", "phoneNumber", "number"]);
  const message = getReplyString(payload, ["message", "text", "body"]);

  if (!phoneNumber || !message) {
    throw new HttpError(
      400,
      "Provide a recipient number and message text before sending a WhatsApp reply.",
    );
  }

  const organization = await findOrganizationForReply(payload);
  if (!organization) {
    throw new HttpError(
      404,
      "Could not find a connected WhatsApp organization for this reply.",
    );
  }

  const instanceName =
    organization.qrSessionId ?? organization.evolutionInstanceName ?? null;

  if (
    !instanceName ||
    !organization.qrConnected ||
    organization.qrStatus !== "connected"
  ) {
    throw new HttpError(
      409,
      "WhatsApp is not connected for this organization.",
    );
  }

  await sendWhatsAppTextMessage({
    instanceName,
    phoneNumber,
    message,
  });

  await createWhatsAppMessageLog({
    organizationId: organization.id,
    instanceName,
    direction: "outbound",
    to: phoneNumber,
    messageType: "conversation",
    text: message,
    status: "SENT",
    source: "n8n",
    providerEvent: "n8n_reply",
    rawPayload: payload,
  });

  res.json({
    ok: true,
    sent: true,
    organizationId: organization.id,
    instanceName,
  });
}
