import { HttpError } from "wasp/server";
import { sendMetaCloudApiTextMessage } from "./metaCloudApi";
import {
  sendWhatsAppTextMessage as sendEvolutionWhatsAppTextMessage,
  type WhatsAppSendMessageResult,
} from "./provider";

type OrganizationTransportRecord = {
  apiStatus: string | null;
  qrConnected: boolean;
  qrStatus: string | null;
  qrSessionId: string | null;
  evolutionInstanceName: string | null;
  settings: unknown | null;
};

function normalizeSettings(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function getNestedRecord(
  settings: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const value = settings[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getConnectedInstanceName(organization: OrganizationTransportRecord) {
  if (!organization.qrConnected && organization.qrStatus !== "connected") {
    return null;
  }

  return organization.qrSessionId ?? organization.evolutionInstanceName ?? null;
}

function getMetaCloudApiPhoneNumberId(settings: unknown) {
  const normalizedSettings = normalizeSettings(settings);
  const metaCloudApi = getNestedRecord(normalizedSettings, "whatsappMetaCloudApi");
  const embeddedSignup = getNestedRecord(
    normalizedSettings,
    "whatsappEmbeddedSignup",
  );
  const setupRequest = getNestedRecord(normalizedSettings, "whatsappApiSetup");

  return (
    getString(metaCloudApi, "phoneNumberId") ||
    getString(embeddedSignup, "phoneNumberId") ||
    getString(setupRequest, "phoneNumberId")
  );
}

export async function sendOrganizationWhatsAppTextMessage(input: {
  organization: OrganizationTransportRecord;
  phoneNumber: string;
  message: string;
}): Promise<{
  provider: "evolution" | "meta-cloud-api";
  mode: "qr" | "api";
  instanceName: string | null;
  phoneNumberId: string | null;
  result: WhatsAppSendMessageResult;
}> {
  const phoneNumberId =
    input.organization.apiStatus === "approved"
      ? getMetaCloudApiPhoneNumberId(input.organization.settings)
      : null;

  if (phoneNumberId) {
    const result = await sendMetaCloudApiTextMessage({
      phoneNumberId,
      phoneNumber: input.phoneNumber,
      message: input.message,
    });

    return {
      provider: "meta-cloud-api",
      mode: "api",
      instanceName: null,
      phoneNumberId,
      result,
    };
  }

  const instanceName = getConnectedInstanceName(input.organization);
  if (!instanceName) {
    if (input.organization.apiStatus === "approved") {
      throw new HttpError(
        409,
        "Official API is approved, but the workspace is missing a Meta phone number ID.",
      );
    }

    throw new HttpError(
      400,
      "No active WhatsApp transport is available. Reconnect QR or finish Official API activation.",
    );
  }

  const result = await sendEvolutionWhatsAppTextMessage({
    instanceName,
    phoneNumber: input.phoneNumber,
    message: input.message,
  });

  return {
    provider: "evolution",
    mode: "qr",
    instanceName,
    phoneNumberId: null,
    result,
  };
}
