import { HttpError, prisma } from "wasp/server";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../../server/validation";
import {
  apiStatusValues,
  onboardingFlowValues,
  primaryGoalValues,
  trafficSourceValues,
  whatsappModeValues,
} from "./constants";

const settingsSchema = z.object({
  saveNewChats: z.boolean(),
  autoTag: z.boolean(),
  notificationsEnabled: z.boolean(),
});

const onboardingInputSchema = z.object({
  step: z.number().int().min(1).max(6),
  validationStep: z.number().int().min(1).max(6).optional(),
  complete: z.boolean().optional().default(false),
  flow: z.enum(onboardingFlowValues),
  businessName: z.string().trim(),
  phoneNumber: z.string().trim(),
  industry: z.string().trim(),
  country: z.string().trim(),
  primaryGoal: z.enum(primaryGoalValues),
  trafficSources: z.array(z.enum(trafficSourceValues)),
  whatsappMode: z.enum(whatsappModeValues),
  qrConnected: z.boolean(),
  apiStatus: z.enum(apiStatusValues),
  saveNewChats: z.boolean(),
  autoTag: z.boolean(),
  notificationsEnabled: z.boolean(),
  businessDescription: z.string().trim(),
  productsServices: z.string().trim(),
  firstAiMessage: z.string().trim(),
  isAiActive: z.boolean(),
});

type OnboardingInput = z.infer<typeof onboardingInputSchema>;

type OnboardingState = {
  onboardingCompleted: boolean;
  onboardingStep: number;
  organization: {
    flow: string;
    name: string;
    phoneNumber: string;
    industry: string;
    country: string;
    primaryGoal: string;
    trafficSources: string[];
    whatsappMode: string;
    qrConnected: boolean;
    apiStatus: string;
    settings: {
      saveNewChats: boolean;
      autoTag: boolean;
      notificationsEnabled: boolean;
    };
    businessDescription: string;
    productsServices: string;
    firstAiMessage: string;
    isAiActive: boolean;
  } | null;
};

function ensureUserId(context: any) {
  if (!context.user?.id) {
    throw new HttpError(401, "Only authenticated users can access onboarding.");
  }

  return context.user.id as string;
}

function validateStepRequirements(args: OnboardingInput) {
  const validationStep = args.validationStep ?? args.step;

  if (validationStep >= 1) {
    if (!args.businessName) {
      throw new HttpError(400, "Business name is required.");
    }
    if (!args.industry) {
      throw new HttpError(400, "Industry is required.");
    }
    if (!args.country) {
      throw new HttpError(400, "Country is required.");
    }
  }

  if (validationStep >= 2) {
    if (!args.primaryGoal) {
      throw new HttpError(400, "A revenue goal is required.");
    }
  }

  if (validationStep >= 3) {
    if (args.trafficSources.length < 1) {
      throw new HttpError(400, "Select at least one traffic source.");
    }
  }

  if (validationStep >= 5) {
    if (!args.businessDescription) {
      throw new HttpError(400, "Business context is required.");
    }
    if (!args.productsServices) {
      throw new HttpError(400, "Products or services are required.");
    }
  }
}

export const getOnboardingState = async (
  _args: unknown,
  context: any,
): Promise<OnboardingState> => {
  const userId = ensureUserId(context);

  const [user, organization] = await Promise.all([
    context.entities.User.findUnique({
      where: { id: userId },
      select: { onboardingCompleted: true, onboardingStep: true },
    }),
    context.entities.Organization.findUnique({
      where: { userId },
      select: {
        name: true,
        phoneNumber: true,
        industry: true,
        country: true,
        primaryGoal: true,
        trafficSources: true,
        flow: true,
        whatsappMode: true,
        qrConnected: true,
        apiStatus: true,
        settings: true,
        businessDescription: true,
        productsServices: true,
        firstAiMessage: true,
        isAiActive: true,
      },
    }),
  ]);

  if (!user) {
    throw new HttpError(404, "User not found.");
  }

  const settingsResult = settingsSchema.safeParse(organization?.settings ?? {});

  return {
    onboardingCompleted: user.onboardingCompleted,
    onboardingStep: user.onboardingStep,
    organization: organization
      ? {
          ...organization,
          flow: organization.flow ?? "sales",
          name: organization.name ?? "",
          phoneNumber: organization.phoneNumber ?? "",
          industry: organization.industry ?? "",
          country: organization.country ?? "",
          primaryGoal: organization.primaryGoal ?? primaryGoalValues[0],
          trafficSources: organization.trafficSources ?? ["whatsapp"],
          whatsappMode: organization.whatsappMode ?? "qr",
          qrConnected: organization.qrConnected ?? false,
          apiStatus: organization.apiStatus ?? "none",
          settings: settingsResult.success
            ? settingsResult.data
            : {
                saveNewChats: true,
                autoTag: true,
                notificationsEnabled: false,
              },
          businessDescription: organization.businessDescription ?? "",
          productsServices: organization.productsServices ?? "",
          firstAiMessage: organization.firstAiMessage ?? "",
          isAiActive: organization.isAiActive ?? true,
        }
      : null,
  };
};

export const saveOnboardingProgress = async (
  rawArgs: unknown,
  context: any,
): Promise<{
  success: true;
  onboardingStep: number;
  onboardingCompleted: boolean;
}> => {
  const userId = ensureUserId(context);
  const args = ensureArgsSchemaOrThrowHttpError(onboardingInputSchema, rawArgs);
  validateStepRequirements(args);

  const nextStep = args.complete ? 6 : args.step;
  const nextApiStatus =
    args.whatsappMode === "api"
      ? args.apiStatus === "none"
        ? "pending"
        : args.apiStatus
      : args.apiStatus;

  await prisma.$transaction(async (tx) => {
    await tx.organization.upsert({
      where: { userId },
      update: {
        flow: args.flow,
        name: args.businessName,
        phoneNumber: args.phoneNumber,
        industry: args.industry,
        country: args.country,
        primaryGoal: args.primaryGoal,
        trafficSources: args.trafficSources,
        whatsappMode: args.whatsappMode,
        qrConnected: args.qrConnected,
        apiStatus: nextApiStatus,
        settings: {
          saveNewChats: args.saveNewChats,
          autoTag: args.autoTag,
          notificationsEnabled: args.notificationsEnabled,
        },
        businessDescription: args.businessDescription,
        productsServices: args.productsServices,
        firstAiMessage: args.firstAiMessage,
        isAiActive: args.isAiActive,
      },
      create: {
        userId,
        flow: args.flow,
        name: args.businessName,
        phoneNumber: args.phoneNumber,
        industry: args.industry,
        country: args.country,
        primaryGoal: args.primaryGoal,
        trafficSources: args.trafficSources,
        whatsappMode: args.whatsappMode,
        qrConnected: args.qrConnected,
        apiStatus: nextApiStatus,
        settings: {
          saveNewChats: args.saveNewChats,
          autoTag: args.autoTag,
          notificationsEnabled: args.notificationsEnabled,
        },
        businessDescription: args.businessDescription,
        productsServices: args.productsServices,
        firstAiMessage: args.firstAiMessage,
        isAiActive: args.isAiActive,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        onboardingStep: nextStep,
        onboardingCompleted: args.complete,
      },
    });
  });

  return {
    success: true,
    onboardingStep: nextStep,
    onboardingCompleted: args.complete,
  };
};
