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
        { qrSessionId: instanceName },
      ],
    },
    select: {
      id: true,
      settings: true,
      evolutionInstanceName: true,
      qrSessionId: true,
    },
  });
}

function extractInboundMessageText(payload: Record<string, unknown>) {
  return (
    findFirstStringByPaths(payload, [
      ["data", "message", "conversation"],
      ["data", "message", "extendedTextMessage", "text"],
      ["data", "message", "imageMessage", "caption"],
      ["data", "message", "videoMessage", "caption"],
      ["message", "conversation"],
      ["message", "extendedTextMessage", "text"],
      ["message", "imageMessage", "caption"],
      ["message", "videoMessage", "caption"],
      ["data", "text"],
      ["text"],
      ["body"],
    ]) ?? "Unsupported message type"
  );
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
  rawPayload?: unknown;
}) {
  await prisma.whatsAppMessageLog.create({
    data: {
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
      rawPayload: rawPayload as any,
    },
  });
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
  const direction = extractInboundDirection(payloadRecord);
  const remoteJid = extractInboundRemoteJid(payloadRecord);

  await createWhatsAppMessageLog({
    organizationId: organization.id,
    instanceName,
    direction,
    from: direction === "inbound" ? remoteJid : null,
    to: direction === "outbound" ? remoteJid : null,
    pushName:
      findFirstStringByPaths(payloadRecord, [
        ["data", "pushName"],
        ["pushName"],
        ["data", "name"],
        ["name"],
      ]) ?? null,
    messageType:
      findFirstStringByPaths(payloadRecord, [
        ["data", "messageType"],
        ["messageType"],
        ["data", "type"],
        ["type"],
      ]) ?? null,
    text: extractInboundMessageText(payloadRecord),
    status:
      findFirstStringByPaths(payloadRecord, [
        ["data", "status"],
        ["status"],
      ]) ?? "RECEIVED",
    source: "evolution",
    providerEvent:
      findFirstStringByPaths(payloadRecord, [
        ["event"],
        ["data", "event"],
      ]) ?? "messages.upsert",
    providerMessageId: extractInboundMessageId(payloadRecord),
    rawPayload: payload,
  });

  const orgWebhook = getWebhookSettings(organization.settings);
  const inboundUrl =
    orgWebhook.enabled && orgWebhook.inboundUrl
      ? orgWebhook.inboundUrl
      : env.N8N_WHATSAPP_INBOUND_WEBHOOK_URL;

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
