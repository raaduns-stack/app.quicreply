import { HttpError, env, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { type WorkspaceSettings } from "./settingsOperations";
import { normalizeAiKnowledgeBase, type AiKnowledgeBase } from "./ai/knowledgeDefaults";

const sandboxHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(4000),
});

const runAiSandboxTestArgsSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  conversationHistory: z
    .array(sandboxHistoryMessageSchema)
    .default([])
    .transform((messages) => messages.slice(-20)),
});

const aiSandboxWebhookResponseSchema = z.object({
  message: z.string().trim().min(1).max(12000),
  confidence: z.number().min(0).max(1).optional(),
  route: z.string().trim().min(1).max(120).optional(),
  warnings: z.array(z.string().trim().min(1).max(240)).max(10).optional(),
});

const AI_SANDBOX_TIMEOUT_MS = 35_000;
const MIN_CONTEXT_LENGTH = 20;

export type AiSandboxHistoryMessage = z.infer<typeof sandboxHistoryMessageSchema>;
export type RunAiSandboxTestInput = z.infer<typeof runAiSandboxTestArgsSchema>;
export type AiSandboxResult = z.infer<typeof aiSandboxWebhookResponseSchema>;

type AiSandboxContextQuality = {
  isReady: boolean;
  missingFields: string[];
  weakFields: string[];
};

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
  contextQuality: AiSandboxContextQuality;
  organization: {
    name: string;
    phoneNumber: string;
    industry: string;
    country: string;
    isAiActive: boolean;
    whatsappMode: string;
    apiStatus: string;
  };
  staff: {
    firstName: string;
    lastName: string;
    displayName: string;
  };
  aiKnowledge: AiKnowledgeBase;
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

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function compactContextValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildSandboxBusinessContext(
  businessContext: AiSandboxWebhookPayload["businessContext"],
  aiKnowledge: AiKnowledgeBase,
  staff: AiSandboxWebhookPayload["staff"],
) {
  const ownerLine = staff.displayName
    ? `Workspace owner reference: ${staff.displayName}. Use this only when directly relevant; do not force personal naming into every reply.`
    : "";

  return {
    businessDescription: [
      businessContext.businessDescription,
      ownerLine,
      `Core product features: ${aiKnowledge.coreFeatures}`,
      `Product pages and navigation: ${aiKnowledge.productPages}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    productsServices: [
      businessContext.productsServices,
      `Pricing and plans: ${aiKnowledge.pricingAndPlans}`,
      `Seats, usage, and limits: ${aiKnowledge.seatsAndLimits}`,
      `Policies and FAQ rules: ${aiKnowledge.policiesAndFaqs}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    firstAiMessage: businessContext.firstAiMessage,
    responseStyle: businessContext.responseStyle,
    aiLanguage: businessContext.aiLanguage,
  };
}

function normalizeSandboxMessage(message: string) {
  const normalizedMessage = message.trim();

  const fakeActionPatterns = [
    /\bi(?:'ve| have)? sent\b/i,
    /\bi(?:'ll| will) send\b/i,
    /\bsent (?:it|that|the follow-?up)\b/i,
    /\bhere(?:'s| is) (?:a )?screenshot\b/i,
    /\bproof\b/i,
    /\bi(?:'ve| have)? attached\b/i,
    /\bi(?:'ve| have)? shared\b/i,
    /\bit has been sent\b/i,
  ];

  const containsFakeActionClaim = fakeActionPatterns.some((pattern) => pattern.test(normalizedMessage));
  if (!containsFakeActionClaim) {
    return {
      message: normalizedMessage,
      warnings: [] as string[],
    };
  }

  const quotedDraftMatch = normalizedMessage.match(/["“](.+?)["”]/s);
  if (quotedDraftMatch?.[1]?.trim()) {
    return {
      message: `I can’t actually send messages from this test sandbox, but here is the exact reply Jennifer would draft:\n\n${quotedDraftMatch[1].trim()}`,
      warnings: ["sandbox_claim_blocked"],
    };
  }

  return {
    message:
      "I can’t actually send messages, attach proof, or complete live actions from this test sandbox. I can draft the exact WhatsApp reply Jennifer should send instead.",
    warnings: ["sandbox_claim_blocked"],
  };
}

function getAiSandboxContextQuality(
  businessContext: AiSandboxWebhookPayload["businessContext"],
): AiSandboxContextQuality {
  const requiredFields: Array<{
    key: keyof AiSandboxWebhookPayload["businessContext"];
    label: string;
  }> = [
    { key: "businessDescription", label: "business/service details" },
    { key: "productsServices", label: "products/services" },
  ];

  const missingFields: string[] = [];
  const weakFields: string[] = [];

  for (const field of requiredFields) {
    const value = compactContextValue(String(businessContext[field.key] ?? ""));
    if (!value) {
      missingFields.push(field.label);
    } else if (value.length < MIN_CONTEXT_LENGTH) {
      weakFields.push(field.label);
    }
  }

  return {
    isReady: missingFields.length === 0 && weakFields.length === 0,
    missingFields,
    weakFields,
  };
}

async function loadWorkspaceSettingsForSandbox(userId: string) {
  const [user, organization] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        username: true,
      },
    }),
    prisma.organization.upsert({
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
    }),
  ]);

  const settings = readSettingsRecord(organization.settings);
  const aiKnowledge = normalizeAiKnowledgeBase(
    settings.aiKnowledge && typeof settings.aiKnowledge === "object" && !Array.isArray(settings.aiKnowledge)
      ? (settings.aiKnowledge as Partial<AiKnowledgeBase>)
      : undefined,
  );
  const firstName = user?.firstName?.trim() ?? "";
  const lastName = user?.lastName?.trim() ?? "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || user?.username?.trim() || "";

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
    staff: {
      firstName,
      lastName,
      displayName,
    },
    aiKnowledge,
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_SANDBOX_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(inboundUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new HttpError(504, "Jennifer runtime timed out.");
    }

    throw new HttpError(502, "Jennifer runtime could not be reached.");
  } finally {
    clearTimeout(timeout);
  }

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

  const normalized = normalizeSandboxMessage(parsed.data.message);

  return {
    ...parsed.data,
    message: normalized.message,
    warnings: [...(parsed.data.warnings ?? []), ...normalized.warnings],
  };
}

export const runAiSandboxTest = async (
  rawArgs: unknown,
  context: any,
): Promise<AiSandboxResult> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(runAiSandboxTestArgsSchema, rawArgs);
  const settings = await loadWorkspaceSettingsForSandbox(userId);
  const contextQuality = getAiSandboxContextQuality(settings.businessContext);

  if (!contextQuality.isReady) {
    throw new HttpError(
      422,
      "Complete Jennifer setup before testing. Add business/service details and products/services first.",
    );
  }

  const payload: AiSandboxWebhookPayload = {
    event: "ai.test",
    version: "2026-05-24",
    source: "quicreply",
    organizationId: settings.organizationId,
    userId,
    prompt: args.prompt,
    conversationHistory: args.conversationHistory,
    businessContext: buildSandboxBusinessContext(
      settings.businessContext,
      settings.aiKnowledge,
      settings.staff,
    ),
    contextQuality,
    organization: settings.organization,
    staff: settings.staff,
    aiKnowledge: settings.aiKnowledge,
    sandbox: {
      channel: "ai-test-page",
      testMode: true,
    },
  };

  return postAiSandboxTestToN8n(payload);
};
