import { HttpError, env, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { type WorkspaceSettings } from "./settingsOperations";

const sandboxHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(4000),
});

const runAiSandboxTestArgsSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  conversationHistory: z.array(sandboxHistoryMessageSchema).max(20).default([]),
});

const aiSandboxWebhookResponseSchema = z.object({
  message: z.string().trim().min(1).max(12000),
  confidence: z.number().min(0).max(1).optional(),
  route: z.string().trim().min(1).max(120).optional(),
  warnings: z.array(z.string().trim().min(1).max(240)).max(10).optional(),
});

export type AiSandboxHistoryMessage = z.infer<typeof sandboxHistoryMessageSchema>;
export type RunAiSandboxTestInput = z.infer<typeof runAiSandboxTestArgsSchema>;
export type AiSandboxResult = z.infer<typeof aiSandboxWebhookResponseSchema>;

type AiSandboxWebhookPayload = {
  event: "ai.test";
  version: "2026-05-24";
  source: "quicreply";
  organizationId: string;
  userId: string;
  prompt: string;
  conversationHistory: AiSandboxHistoryMessage[];
  businessContext: {
    businessDescription: string;
    productsServices: string;
    firstAiMessage: string;
    responseStyle: WorkspaceSettings["preferences"]["responseStyle"];
    aiLanguage: WorkspaceSettings["preferences"]["aiLanguage"];
  };
  organization: {
    name: string;
    phoneNumber: string;
    industry: string;
    country: string;
    isAiActive: boolean;
    whatsappMode: string;
    apiStatus: string;
  };
  sandbox: {
    channel: "ai-test-page";
    testMode: true;
  };
};

function ensureUserId(context: any) {
  if (!context.user?.id) {
    throw new HttpError(401, "Only authenticated users can run AI sandbox tests.");
  }

  return context.user.id as string;
}

function readSettingsRecord(settings: unknown) {
  return settings && typeof settings === "object" && !Array.isArray(settings)
    ? (settings as Record<string, unknown>)
    : {};
}

function readString(settings: Record<string, unknown>, key: string, fallback: string) {
  return typeof settings[key] === "string" && settings[key]
    ? (settings[key] as string)
    : fallback;
}

async function loadWorkspaceSettingsForSandbox(userId: string) {
  const organization = await prisma.organization.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      industry: true,
      country: true,
      businessDescription: true,
      productsServices: true,
      firstAiMessage: true,
      isAiActive: true,
      whatsappMode: true,
      apiStatus: true,
      settings: true,
    },
  });

  const settings = readSettingsRecord(organization.settings);

  return {
    organizationId: organization.id,
    organization: {
      name: organization.name ?? "",
      phoneNumber: organization.phoneNumber ?? "",
      industry: organization.industry ?? "",
      country: organization.country ?? "",
      isAiActive: organization.isAiActive ?? true,
      whatsappMode: organization.whatsappMode ?? "qr",
      apiStatus: organization.apiStatus ?? "none",
    },
    businessContext: {
      businessDescription: organization.businessDescription ?? "",
      productsServices: organization.productsServices ?? "",
      firstAiMessage: organization.firstAiMessage ?? "",
      responseStyle: readString(settings, "responseStyle", "professional") as WorkspaceSettings["preferences"]["responseStyle"],
      aiLanguage: readString(settings, "aiLanguage", "english") as WorkspaceSettings["preferences"]["aiLanguage"],
    },
  };
}

async function postAiSandboxTestToN8n(
  payload: AiSandboxWebhookPayload,
): Promise<AiSandboxResult> {
  const inboundUrl = env.N8N_AI_TEST_WEBHOOK_URL;
  if (!inboundUrl) {
    throw new HttpError(503, "AI sandbox runtime is not configured.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-quicreply-event": payload.event,
  };

  if (env.N8N_AI_TEST_WEBHOOK_SECRET) {
    headers["x-quicreply-webhook-secret"] = env.N8N_AI_TEST_WEBHOOK_SECRET;
  }

  const response = await fetch(inboundUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new HttpError(502, "Jennifer runtime did not return a valid sandbox response.");
  }

  let responseJson: unknown;
  try {
    responseJson = await response.json();
  } catch {
    throw new HttpError(502, "Jennifer runtime returned a non-JSON sandbox response.");
  }

  const parsed = aiSandboxWebhookResponseSchema.safeParse(responseJson);
  if (!parsed.success) {
    throw new HttpError(502, "Jennifer runtime returned an invalid sandbox payload.");
  }

  return parsed.data;
}

export const runAiSandboxTest = async (
  rawArgs: unknown,
  context: any,
): Promise<AiSandboxResult> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(runAiSandboxTestArgsSchema, rawArgs);
  const settings = await loadWorkspaceSettingsForSandbox(userId);

  const payload: AiSandboxWebhookPayload = {
    event: "ai.test",
    version: "2026-05-24",
    source: "quicreply",
    organizationId: settings.organizationId,
    userId,
    prompt: args.prompt,
    conversationHistory: args.conversationHistory,
    businessContext: settings.businessContext,
    organization: settings.organization,
    sandbox: {
      channel: "ai-test-page",
      testMode: true,
    },
  };

  return postAiSandboxTestToN8n(payload);
};
