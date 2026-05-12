import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { getStaffDisplayName, getWorkspaceCurrency } from "../server/workspaceSettings";

const currencySchema = z.enum(["NGN", "USD", "EUR", "GBP", "INR", "CAD", "AUD"]);
const timezoneSchema = z.enum([
  "Africa/Lagos",
  "UTC",
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
]);

const updateWorkspaceSettingsSchema = z.object({
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  organizationName: z.string().trim().min(1).max(120),
  phoneNumber: z.string().trim().max(40).optional(),
  industry: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  currency: currencySchema,
  timezone: timezoneSchema,
  saveNewChats: z.boolean(),
  autoTag: z.boolean(),
  notificationsEnabled: z.boolean(),
  autoConfigureSystem: z.boolean(),
  isAiActive: z.boolean(),
  responseStyle: z.enum(["professional", "friendly", "formal"]),
  aiLanguage: z.enum(["english", "yoruba", "spanish"]),
  businessDescription: z.string().trim().max(2000).optional(),
  productsServices: z.string().trim().max(2000).optional(),
  firstAiMessage: z.string().trim().max(1000).optional(),
});

type UpdateWorkspaceSettingsInput = z.infer<typeof updateWorkspaceSettingsSchema>;

export type WorkspaceSettings = {
  staff: {
    firstName: string;
    lastName: string;
    displayName: string;
    email: string | null;
    role: string;
  };
  organization: {
    name: string;
    phoneNumber: string;
    industry: string;
    country: string;
    businessDescription: string;
    productsServices: string;
    firstAiMessage: string;
    isAiActive: boolean;
    whatsappMode: string;
    qrConnected: boolean;
    apiStatus: string;
  };
  preferences: {
    currency: string;
    currencySymbol: string;
    timezone: z.infer<typeof timezoneSchema>;
    saveNewChats: boolean;
    autoTag: boolean;
    notificationsEnabled: boolean;
    autoConfigureSystem: boolean;
    responseStyle: "professional" | "friendly" | "formal";
    aiLanguage: "english" | "yoruba" | "spanish";
  };
  billing: {
    subscriptionPlan: string | null;
    subscriptionStatus: string | null;
    customerPortalUrl: string | null;
  };
};

function ensureUserId(context: any) {
  if (!context.user?.id) {
    throw new HttpError(401, "Only authenticated users can access settings.");
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

function readBoolean(settings: Record<string, unknown>, key: string, fallback: boolean) {
  return typeof settings[key] === "boolean" ? (settings[key] as boolean) : fallback;
}

function normalizeTimezone(value: unknown): z.infer<typeof timezoneSchema> {
  const parsed = timezoneSchema.safeParse(value);
  return parsed.success ? parsed.data : "Africa/Lagos";
}

function normalizeResponseStyle(value: unknown): "professional" | "friendly" | "formal" {
  return value === "friendly" || value === "formal" ? value : "professional";
}

function normalizeAiLanguage(value: unknown): "english" | "yoruba" | "spanish" {
  return value === "yoruba" || value === "spanish" ? value : "english";
}

function toWorkspaceSettingsResponse(user: any, organization: any): WorkspaceSettings {
  const settings = readSettingsRecord(organization?.settings);
  const currency = getWorkspaceCurrency(settings, organization?.country);

  return {
    staff: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      displayName: getStaffDisplayName(user ?? {}),
      email: user?.email ?? null,
      role: user?.isAdmin ? "Workspace Admin" : "Team Member",
    },
    organization: {
      name: organization?.name || "Revenue Sales OS",
      phoneNumber: organization?.phoneNumber ?? "",
      industry: organization?.industry ?? "",
      country: organization?.country ?? "",
      businessDescription: organization?.businessDescription ?? "",
      productsServices: organization?.productsServices ?? "",
      firstAiMessage: organization?.firstAiMessage ?? "",
      isAiActive: organization?.isAiActive ?? true,
      whatsappMode: organization?.whatsappMode ?? "qr",
      qrConnected: organization?.qrConnected ?? false,
      apiStatus: organization?.apiStatus ?? "none",
    },
    preferences: {
      currency: currency.code,
      currencySymbol: currency.symbol,
      timezone: normalizeTimezone(settings.timezone),
      saveNewChats: readBoolean(settings, "saveNewChats", true),
      autoTag: readBoolean(settings, "autoTag", true),
      notificationsEnabled: readBoolean(settings, "notificationsEnabled", true),
      autoConfigureSystem: readBoolean(settings, "autoConfigureSystem", true),
      responseStyle: normalizeResponseStyle(settings.responseStyle),
      aiLanguage: normalizeAiLanguage(settings.aiLanguage),
    },
    billing: {
      subscriptionPlan: user?.subscriptionPlan ?? null,
      subscriptionStatus: user?.subscriptionStatus ?? null,
      customerPortalUrl: user?.lemonSqueezyCustomerPortalUrl ?? null,
    },
  };
}

export const getWorkspaceSettings = async (
  _args: unknown,
  context: any,
): Promise<WorkspaceSettings> => {
  const userId = ensureUserId(context);
  const [user, organization] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        lemonSqueezyCustomerPortalUrl: true,
      },
    }),
    prisma.organization.upsert({
      where: { userId },
      update: {},
      create: { userId },
    }),
  ]);

  return toWorkspaceSettingsResponse(user, organization);
};

export const updateWorkspaceSettings = async (
  rawArgs: unknown,
  context: any,
): Promise<WorkspaceSettings> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(
    updateWorkspaceSettingsSchema,
    rawArgs,
  );

  const organization = await prisma.organization.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: { settings: true },
  });

  const existingSettings = readSettingsRecord(organization.settings);
  const nextSettings = {
    ...existingSettings,
    currency: args.currency,
    currencyCode: args.currency,
    timezone: args.timezone,
    saveNewChats: args.saveNewChats,
    autoTag: args.autoTag,
    notificationsEnabled: args.notificationsEnabled,
    autoConfigureSystem: args.autoConfigureSystem,
    responseStyle: args.responseStyle,
    aiLanguage: args.aiLanguage,
  };

  const [user, updatedOrganization] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        firstName: args.firstName || null,
        lastName: args.lastName || null,
      },
      select: {
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isAdmin: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        lemonSqueezyCustomerPortalUrl: true,
      },
    }),
    prisma.organization.update({
      where: { userId },
      data: {
        name: args.organizationName,
        phoneNumber: args.phoneNumber || null,
        industry: args.industry || null,
        country: args.country || null,
        businessDescription: args.businessDescription || null,
        productsServices: args.productsServices || null,
        firstAiMessage: args.firstAiMessage || null,
        isAiActive: args.isAiActive,
        settings: nextSettings,
      },
    }),
  ]);

  return toWorkspaceSettingsResponse(user, updatedOrganization);
};
