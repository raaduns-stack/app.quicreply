import crypto from "crypto";
import express from "express";
import {
  HttpError,
  env,
  type MiddlewareConfigFn,
} from "wasp/server";
import type { WhatsAppSendMessageResult } from "./provider";

const DEFAULT_META_API_VERSION = "v23.0";

function getMetaApiVersion() {
  return env.META_WHATSAPP_API_VERSION?.trim() || DEFAULT_META_API_VERSION;
}

function getMetaGraphUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `https://graph.facebook.com/${getMetaApiVersion()}${normalizedPath}`;
}

function getMetaSystemUserToken() {
  const token = env.META_WHATSAPP_SYSTEM_USER_TOKEN?.trim();
  if (!token) {
    throw new HttpError(
      500,
      "META_WHATSAPP_SYSTEM_USER_TOKEN is required for Meta Cloud API calls.",
    );
  }

  return token;
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) {
    throw new HttpError(400, "Enter a valid WhatsApp phone number.");
  }

  return digits;
}

function getMetaErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  const error =
    record.error &&
    typeof record.error === "object" &&
    !Array.isArray(record.error)
      ? (record.error as Record<string, unknown>)
      : null;

  if (error) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  const genericMessage = record.message;
  if (typeof genericMessage === "string" && genericMessage.trim()) {
    return genericMessage.trim();
  }

  return fallback;
}

async function readJsonSafely(response: Response) {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function metaGraphRequest<T>(
  path: string,
  {
    method = "GET",
    token,
    body,
  }: {
    method?: "GET" | "POST";
    token?: string;
    body?: Record<string, unknown>;
  } = {},
): Promise<T> {
  const response = await fetch(getMetaGraphUrl(path), {
    method,
    headers: {
      Authorization: `Bearer ${token || getMetaSystemUserToken()}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await readJsonSafely(response);

  if (!response.ok) {
    throw new HttpError(
      response.status >= 500 ? 502 : response.status,
      getMetaErrorMessage(payload, "Meta Graph API request failed."),
    );
  }

  return payload as T;
}

export async function sendMetaCloudApiTextMessage(input: {
  phoneNumberId: string;
  phoneNumber: string;
  message: string;
  accessToken?: string | null;
}): Promise<WhatsAppSendMessageResult> {
  const text = input.message.trim();
  if (!text) {
    throw new HttpError(400, "Enter a WhatsApp message before sending.");
  }

  const response = await metaGraphRequest<{
    messages?: Array<{ id?: string | null }>;
  }>(`/${encodeURIComponent(input.phoneNumberId)}/messages`, {
    method: "POST",
    token: input.accessToken || undefined,
    body: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhoneNumber(input.phoneNumber),
      type: "text",
      text: {
        body: text,
        preview_url: false,
      },
    },
  });

  return {
    success: true,
    providerMessageId: response.messages?.[0]?.id ?? null,
    status: "accepted",
    rawResponse: response,
  };
}

export async function subscribeMetaAppToWaba(input: {
  wabaId: string;
  accessToken?: string | null;
}) {
  return metaGraphRequest<unknown>(
    `/${encodeURIComponent(input.wabaId)}/subscribed_apps`,
    {
      method: "POST",
      token: input.accessToken || undefined,
    },
  );
}

function getRawRequestBody(request: any) {
  if (Buffer.isBuffer(request.body)) {
    return request.body;
  }

  if (typeof request.body === "string") {
    return Buffer.from(request.body, "utf8");
  }

  return Buffer.from(JSON.stringify(request.body ?? {}), "utf8");
}

export function parseMetaWebhookPayload(request: any) {
  const rawBody = getRawRequestBody(request);
  const text = rawBody.toString("utf8").trim();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Invalid Meta webhook JSON payload.");
  }
}

export function validateMetaWebhookSignature(request: any) {
  const appSecret = env.META_WHATSAPP_APP_SECRET?.trim();
  if (!appSecret) {
    return;
  }

  const signature =
    (typeof request.get === "function"
      ? request.get("x-hub-signature-256")
      : request.headers?.["x-hub-signature-256"]) ?? null;

  if (typeof signature !== "string" || !signature.startsWith("sha256=")) {
    throw new HttpError(
      401,
      "Meta webhook signature is missing or malformed.",
    );
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(getRawRequestBody(request))
    .digest("hex")}`;

  if (
    expected.length !== signature.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expected, "utf8"),
    )
  ) {
    throw new HttpError(401, "Invalid Meta webhook signature.");
  }
}

export function getMetaWebhookVerificationChallenge(request: any) {
  const mode = request.query?.["hub.mode"];
  const verifyToken = request.query?.["hub.verify_token"];
  const challenge = request.query?.["hub.challenge"];
  const expectedVerifyToken = env.META_WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();

  if (mode !== "subscribe") {
    throw new HttpError(400, "Unsupported Meta webhook mode.");
  }

  if (!expectedVerifyToken) {
    throw new HttpError(
      500,
      "META_WHATSAPP_WEBHOOK_VERIFY_TOKEN is not configured.",
    );
  }

  if (verifyToken !== expectedVerifyToken) {
    throw new HttpError(403, "Invalid Meta webhook verify token.");
  }

  if (typeof challenge !== "string" || !challenge.trim()) {
    throw new HttpError(400, "Missing Meta webhook challenge.");
  }

  return challenge;
}

export const metaWebhookMiddlewareConfigFn: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.delete("express.json");
  middlewareConfig.set(
    "express.raw",
    express.raw({ type: "application/json" }),
  );
  return middlewareConfig;
};
