import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Database,
  Flag,
  Link2,
  Loader2,
  Lightbulb,
  Megaphone,
  QrCode,
  Rocket,
  Shield,
  Sparkles,
  Store,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import {
  getOnboardingState,
  saveOnboardingProgress,
  useQuery,
} from "wasp/client/operations";
import { routes } from "wasp/client/router";
import { type AuthUser } from "wasp/auth";
import * as z from "zod";
import { useToast } from "../../client/hooks/use-toast";
import TextLogoLight from "../../client/static/logos/TextLogo_light.png";
import { cn } from "../../client/utils";
import {
  apiStatusValues,
  countryOptions,
  industryOptions,
  onboardingFlowContent,
  onboardingFlowOptions,
  onboardingFlowValues,
  onboardingSteps,
  primaryGoalOptions,
  primaryGoalValues,
  trafficSourceOptions,
  trafficSourceValues,
  whatsappModeOptions,
  whatsappModeValues,
} from "./constants";

const onboardingFormSchema = z.object({
  flow: z.enum(onboardingFlowValues),
  businessName: z.string().trim().min(1, "Business name is required."),
  phoneNumber: z.string().trim(),
  industry: z.string().trim().min(1, "Industry is required."),
  country: z.string().trim().min(1, "Country is required."),
  primaryGoal: z.enum(primaryGoalValues, {
    message: "Choose your main revenue goal.",
  }),
  trafficSources: z
    .array(z.enum(trafficSourceValues))
    .min(1, "Select at least one traffic source."),
  whatsappMode: z.enum(whatsappModeValues),
  qrConnected: z.boolean(),
  apiStatus: z.enum(apiStatusValues),
  saveNewChats: z.boolean(),
  autoTag: z.boolean(),
  notificationsEnabled: z.boolean(),
  businessDescription: z
    .string()
    .trim()
    .min(1, "Business context is required."),
  productsServices: z
    .string()
    .trim()
    .min(1, "Products or services are required."),
  firstAiMessage: z.string().trim(),
  isAiActive: z.boolean(),
});

type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

const defaultValues: OnboardingFormValues = {
  flow: "sales",
  businessName: "",
  phoneNumber: "",
  industry: "",
  country: "",
  primaryGoal: "generate_leads",
  trafficSources: [],
  whatsappMode: "qr",
  qrConnected: false,
  apiStatus: "none",
  saveNewChats: true,
  autoTag: true,
  notificationsEnabled: false,
  businessDescription: "",
  productsServices: "",
  firstAiMessage: onboardingFlowContent.sales.firstMessagePlaceholder,
  isAiActive: true,
};

const stepFields: Record<number, Array<keyof OnboardingFormValues>> = {
  1: ["businessName", "industry", "country", "primaryGoal", "trafficSources"],
  2: [],
  3: ["businessDescription", "productsServices", "firstAiMessage"],
  4: [],
};

const progressSteps = [
  { step: 1, icon: Store },
  { step: 2, icon: Link2 },
  { step: 3, icon: Bot },
  { step: 4, icon: Flag },
] as const;

function StepDot({
  icon: Icon,
  state,
}: {
  icon: (typeof progressSteps)[number]["icon"];
  state: "upcoming" | "active" | "done";
}) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all",
        state === "active" &&
          "border-[#fe901d] bg-[#fe901d] text-white",
        state === "done" &&
          "border-[#fe901d] bg-[rgba(254,144,29,0.08)] text-[#fe901d]",
        state === "upcoming" && "border-[#e5e7eb] bg-white text-[#9ca3af]",
      )}
    >
      {state === "done" ? (
        <Check className="h-4 w-4" strokeWidth={3} />
      ) : (
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      )}
    </div>
  );
}

function ProgressStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center px-4">
      {progressSteps.map((item, index) => {
        const isDone = currentStep > item.step;
        const isActive = currentStep === item.step;

        return (
          <div key={item.step} className="flex flex-1 items-center">
            <StepDot
              icon={item.icon}
              state={isDone ? "done" : isActive ? "active" : "upcoming"}
            />
            {index < progressSteps.length - 1 ? (
              <div
                className={cn(
                  "h-[2px] flex-1 transition-colors",
                  currentStep > item.step ? "bg-[#fe901d]" : "bg-[#e5e7eb]",
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function SectionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[20px] border border-[#e5e7eb] bg-white p-5", className)}>
      {children}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm font-medium text-red-600">{message}</p>;
}

function SelectionCard({
  active,
  children,
  className,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      className={cn(
        "block w-full cursor-pointer rounded-[18px] border-[1.5px] bg-white p-4 text-left transition duration-200 disabled:cursor-not-allowed",
        active
          ? "border-[#fe901d] bg-[linear-gradient(180deg,rgba(254,144,29,0.08),rgba(254,144,29,0.03))]"
          : "border-[#e5e7eb] hover:-translate-y-px hover:shadow-[0_10px_20px_rgba(15,23,42,0.04)]",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export default function OnboardingPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery(getOnboardingState);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [showQrFlow, setShowQrFlow] = useState(false);
  const [showTrainingOverlay, setShowTrainingOverlay] = useState(false);
  const isOnboardingCompleted =
    (user as AuthUser & { onboardingCompleted?: boolean }).onboardingCompleted ===
    true;

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues,
    mode: "onTouched",
  });

  const watchedValues = form.watch();
  const currentFlow = watchedValues.flow;
  const flowCopy = onboardingFlowContent[currentFlow];
  const stepMeta = onboardingSteps[currentStep - 1];

  useEffect(() => {
    if (isOnboardingCompleted || data?.onboardingCompleted) {
      navigate(routes.UserPageRoute.to, { replace: true });
    }
  }, [data?.onboardingCompleted, isOnboardingCompleted, navigate]);

  useEffect(() => {
    if (!data) {
      return;
    }

    const nextStep = Math.min(Math.max(data.onboardingStep || 1, 1), 4);
    setCurrentStep(nextStep);

    if (!data.organization) {
      setShowQrFlow(false);
      return;
    }

    form.reset({
      flow:
        (data.organization.flow as OnboardingFormValues["flow"]) ||
        defaultValues.flow,
      businessName: data.organization.name || "",
      phoneNumber: data.organization.phoneNumber || "",
      industry: data.organization.industry || "",
      country: data.organization.country || "",
      primaryGoal:
        (data.organization.primaryGoal as OnboardingFormValues["primaryGoal"]) ||
        defaultValues.primaryGoal,
      trafficSources:
        (data.organization.trafficSources.filter((source) =>
          trafficSourceValues.includes(
            source as (typeof trafficSourceValues)[number],
          ),
        ) as OnboardingFormValues["trafficSources"]) || [],
      whatsappMode:
        (data.organization.whatsappMode as OnboardingFormValues["whatsappMode"]) ||
        defaultValues.whatsappMode,
      qrConnected: data.organization.qrConnected ?? false,
      apiStatus:
        (data.organization.apiStatus as OnboardingFormValues["apiStatus"]) ||
        defaultValues.apiStatus,
      saveNewChats: data.organization.settings.saveNewChats,
      autoTag: data.organization.settings.autoTag,
      notificationsEnabled: data.organization.settings.notificationsEnabled,
      businessDescription: data.organization.businessDescription || "",
      productsServices: data.organization.productsServices || "",
      firstAiMessage:
        data.organization.firstAiMessage || defaultValues.firstAiMessage,
      isAiActive: data.organization.isAiActive ?? defaultValues.isAiActive,
    });

    setShowQrFlow(
      nextStep === 2 &&
        (data.organization.whatsappMode === "qr" ||
          data.organization.whatsappMode === null) &&
        Boolean(data.organization.qrConnected),
    );
  }, [data, form]);

  async function persistStep(step: number, complete = false) {
    const values = form.getValues();
    setIsSavingStep(true);

    try {
      await saveOnboardingProgress({
        ...values,
        step,
        complete,
      });
      return true;
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: complete ? "Could not finish onboarding" : "Could not save this step",
        description: err?.message || "Please try again.",
      });
      return false;
    } finally {
      setIsSavingStep(false);
    }
  }

  async function handleBusinessContinue() {
    const isValid = await form.trigger(stepFields[1], { shouldFocus: true });
    if (!isValid) {
      return;
    }

    const saved = await persistStep(2, false);
    if (!saved) {
      return;
    }

    setShowQrFlow(false);
    setCurrentStep(2);
  }

  async function handleWhatsappPrimaryAction() {
    if (watchedValues.whatsappMode === "api") {
      form.setValue("apiStatus", "pending", { shouldDirty: true });
      const saved = await persistStep(3, false);
      if (!saved) {
        return;
      }
      setShowQrFlow(false);
      setCurrentStep(3);
      return;
    }

    form.setValue("qrConnected", true, { shouldDirty: true });
    const saved = await persistStep(2, false);
    if (!saved) {
      return;
    }

    setShowQrFlow(true);
  }

  async function handleQrComplete() {
    const saved = await persistStep(3, false);
    if (!saved) {
      return;
    }

    toast({
      title: "QR connected successfully",
      description: "Your instant revenue engine is ready to keep moving.",
    });
    setShowQrFlow(false);
    setCurrentStep(3);
  }

  async function handleAiContinue() {
    const isValid = await form.trigger(stepFields[3], { shouldFocus: true });
    if (!isValid) {
      return;
    }

    setShowTrainingOverlay(true);

    window.setTimeout(async () => {
      const saved = await persistStep(4, false);
      setShowTrainingOverlay(false);

      if (!saved) {
        return;
      }

      setCurrentStep(4);
    }, 2400);
  }

  async function handleFinish() {
    const saved = await persistStep(4, true);
    if (!saved) {
      return;
    }

    toast({
      title: "Revenue engine primed",
      description: "Unlocking your dashboard now.",
    });
    window.location.assign(routes.UserPageRoute.to);
  }

  const nextButtonBusy = isSavingStep || showTrainingOverlay;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(254,144,29,0.10),transparent_28%),#fffdf8] text-[#191c1d]">
      <div className="sticky top-0 z-30 border-b border-[#e5e7eb] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <img alt="QuicReply" className="h-8 w-auto" src={TextLogoLight} />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b7280]">
            {stepMeta.badge}
          </p>
        </div>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[1100px] items-center justify-center px-6 py-10 pb-20">
        <div className="w-full space-y-6">
          <ProgressStepper currentStep={currentStep} />

          {isLoading ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-[#e5e7eb] bg-white text-sm font-medium text-[#5f5e5e]">
              Loading your onboarding workspace...
            </div>
          ) : error ? (
            <div className="rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
              We could not load your onboarding state right now. Refresh and try again.
            </div>
          ) : (
            <>
              {currentStep === 1 ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff1df] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#c96a00]">
                        {flowCopy.step1Badge}
                      </span>
                      <h1 className="mt-3 text-3xl font-black text-gray-900">
                        {flowCopy.step1Headline}
                      </h1>
                      <p className="mt-2 max-w-2xl text-gray-600">
                        {flowCopy.step1Description}
                      </p>
                    </div>
                    <div className="max-w-sm rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.015)]">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                        {flowCopy.flowLabel} Active
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        `org.flow`, `org.name`, `org.primaryGoal`, `org.trafficSources`
                      </p>
                    </div>
                  </div>

                  <SectionCard className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-[#fe901d]" />
                      <h2 className="text-base font-bold text-gray-900">
                        Choose your engine
                      </h2>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {onboardingFlowOptions.map((option) => {
                        const selected = currentFlow === option.value;
                        const icon =
                          option.value === "sales" ? (
                            <Bot className="h-5 w-5 text-[#fe901d]" />
                          ) : (
                            <Megaphone className="h-5 w-5 text-[#fe901d]" />
                          );

                        return (
                          <SelectionCard
                            key={option.value}
                            active={selected}
                            onClick={() => {
                              const previousFlow = form.getValues("flow");
                              const previousDefault =
                                onboardingFlowContent[previousFlow].firstMessagePlaceholder;
                              const nextDefault =
                                onboardingFlowContent[option.value].firstMessagePlaceholder;

                              form.setValue("flow", option.value, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });

                              const currentMessage = form.getValues("firstAiMessage");
                              if (!currentMessage || currentMessage === previousDefault) {
                                form.setValue("firstAiMessage", nextDefault, {
                                  shouldDirty: true,
                                });
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-3">
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1df] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#c96a00]">
                                  {option.eyebrow}
                                </span>
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">
                                    {option.label}
                                  </h3>
                                  <p className="mt-1 text-sm text-gray-600">
                                    {option.description}
                                  </p>
                                </div>
                                <ul className="space-y-1.5 text-sm text-gray-600">
                                  {option.points.map((point) => (
                                    <li key={point} className="flex items-center gap-2">
                                      <CheckCircle2 className="h-4 w-4 text-[#fe901d]" />
                                      {point}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgba(254,144,29,0.14)]">
                                {icon}
                              </div>
                            </div>
                          </SelectionCard>
                        );
                      })}
                    </div>
                  </SectionCard>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_.8fr]">
                    <div className="space-y-6">
                      <SectionCard className="space-y-5">
                        <div className="flex items-center gap-2">
                          <Store className="h-5 w-5 text-[#fe901d]" />
                          <h2 className="text-base font-bold text-gray-900">
                            A. Business Info
                          </h2>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                              Business Name
                            </label>
                            <input
                              className="w-full rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#fe901d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(254,144,29,0.12)]"
                              placeholder="Acme Growth Studio"
                              {...form.register("businessName")}
                            />
                            <FieldError
                              message={form.formState.errors.businessName?.message}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                              Industry
                            </label>
                            <select
                              className="w-full cursor-pointer rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#fe901d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(254,144,29,0.12)]"
                              {...form.register("industry")}
                            >
                              <option value="">Select industry</option>
                              {industryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <FieldError
                              message={form.formState.errors.industry?.message}
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                              Country
                            </label>
                            <select
                              className="w-full cursor-pointer rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#fe901d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(254,144,29,0.12)]"
                              {...form.register("country")}
                            >
                              <option value="">Select country</option>
                              {countryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <FieldError
                              message={form.formState.errors.country?.message}
                            />
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard className="space-y-5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-[#fe901d]" />
                          <h2 className="text-base font-bold text-gray-900">
                            B. Revenue Goal
                          </h2>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {primaryGoalOptions.map((option) => {
                            const selected = watchedValues.primaryGoal === option.value;
                            return (
                              <SelectionCard
                                key={option.value}
                                active={selected}
                                onClick={() =>
                                  form.setValue("primaryGoal", option.value, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  })
                                }
                              >
                                <div className="font-semibold text-gray-900">
                                  {option.label}
                                </div>
                                <p className="mt-1 text-xs text-gray-600">
                                  {option.description}
                                </p>
                              </SelectionCard>
                            );
                          })}
                        </div>
                        <FieldError
                          message={form.formState.errors.primaryGoal?.message}
                        />
                      </SectionCard>

                      <SectionCard className="space-y-5">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-5 w-5 text-[#fe901d]" />
                          <h2 className="text-base font-bold text-gray-900">
                            C. Traffic Source
                          </h2>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {trafficSourceOptions.map((option) => {
                            const selected = watchedValues.trafficSources.includes(
                              option.value,
                            );
                            return (
                              <SelectionCard
                                key={option.value}
                                active={selected}
                                onClick={() => {
                                  const currentSources = form.getValues("trafficSources");
                                  const nextSources = currentSources.includes(option.value)
                                    ? currentSources.filter(
                                        (value) => value !== option.value,
                                      )
                                    : [...currentSources, option.value];
                                  form.setValue("trafficSources", nextSources, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                }}
                              >
                                <div className="font-semibold text-gray-900">
                                  {option.label}
                                </div>
                                <p className="mt-1 text-xs text-gray-600">
                                  {option.value === "ads" &&
                                    "Facebook, Instagram, Google, or TikTok traffic."}
                                  {option.value === "website" &&
                                    "Leads coming through landing pages or forms."}
                                  {option.value === "whatsapp" &&
                                    "Existing conversations and direct replies."}
                                  {option.value === "other" &&
                                    "Any other acquisition source you want to track."}
                                </p>
                              </SelectionCard>
                            );
                          })}
                        </div>
                        <FieldError
                          message={form.formState.errors.trafficSources?.message}
                        />
                      </SectionCard>
                    </div>

                    <aside className="space-y-6">
                      <SectionCard className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Database className="h-5 w-5 text-[#fe901d]" />
                          <h2 className="text-base font-bold text-gray-900">
                            Revenue OS Profile
                          </h2>
                        </div>
                        <ul className="space-y-3 text-sm text-gray-600">
                          <li className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                            <span>
                              <strong className="text-gray-900">org.name</strong>:
                              {" "}Business identity.
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                            <span>
                              <strong className="text-gray-900">org.primaryGoal</strong>:
                              {" "}Revenue outcome.
                            </span>
                          </li>
                          <li className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                            <span>
                              <strong className="text-gray-900">org.trafficSources</strong>:
                              {" "}Funnel entry points.
                            </span>
                          </li>
                        </ul>
                      </SectionCard>

                      <SectionCard className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-[#fe901d]" />
                          <h2 className="text-base font-bold text-gray-900">
                            Activation Tip
                          </h2>
                        </div>
                        <p className="text-sm text-gray-600">
                          {flowCopy.step1Tip}
                        </p>
                      </SectionCard>

                      <SectionCard className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                          DB mapping
                        </p>
                        <div className="rounded-2xl border border-[rgba(254,144,29,0.16)] bg-[rgba(254,144,29,0.08)] p-4 font-mono text-sm leading-6 text-gray-800">
                          {"{"}
                          <br />
                          &nbsp;&nbsp;"flow": "{currentFlow}",
                          <br />
                          &nbsp;&nbsp;"primaryGoal": "...",
                          <br />
                          &nbsp;&nbsp;"trafficSources": [...]
                          <br />
                          {"}"}
                        </div>
                      </SectionCard>
                    </aside>
                  </div>

                  <div className="flex flex-col items-center justify-between gap-4 pt-2 md:flex-row">
                    <button
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#111827] md:w-auto"
                      onClick={() => navigate(routes.UserPageRoute.to)}
                      type="button"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>

                    <button
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,#fe901d,#ffb84d)] px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(254,144,29,0.3)] disabled:cursor-not-allowed md:w-auto"
                      disabled={nextButtonBusy}
                      onClick={handleBusinessContinue}
                      type="button"
                    >
                      {nextButtonBusy ? "Saving..." : "Continue to WhatsApp"}
                      {nextButtonBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ) : null}

              {currentStep === 2 ? (
                <div className="space-y-6">
                  <div className="text-center space-y-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff1df] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#c96a00]">
                      {flowCopy.step2Badge}
                    </span>
                    <h1 className="text-3xl font-black text-gray-900">
                      Connect your WhatsApp
                    </h1>
                    <p className="mx-auto max-w-2xl text-gray-600">
                      {flowCopy.step2Description}
                    </p>
                  </div>

                  {!showQrFlow ? (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      {whatsappModeOptions.map((option) => {
                        const selected = watchedValues.whatsappMode === option.value;
                        return (
                          <SelectionCard
                            key={option.value}
                            active={selected}
                            className="h-full rounded-[22px] p-5"
                            onClick={() => {
                              form.setValue("whatsappMode", option.value, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              form.setValue(
                                "apiStatus",
                                option.value === "api" ? "pending" : "none",
                                { shouldDirty: true },
                              );
                              if (option.value !== "qr") {
                                form.setValue("qrConnected", false, {
                                  shouldDirty: true,
                                });
                              }
                            }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]",
                                      option.value === "qr"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-blue-100 text-blue-700",
                                    )}
                                  >
                                    {option.value === "qr" ? "Option A" : "Option B"}
                                  </span>
                                  {option.value === "qr" ? (
                                    <span className="rounded-full bg-[rgba(254,144,29,0.10)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#fe901d]">
                                      Default
                                    </span>
                                  ) : null}
                                </div>

                                <div>
                                  <h2 className="text-xl font-bold text-gray-900">
                                    {option.value === "qr"
                                      ? "Connect instantly (Scan QR)"
                                      : "Official WhatsApp API"}
                                  </h2>
                                  <p className="mt-1 text-sm text-gray-600">
                                    {option.value === "qr"
                                      ? "Perfect for handling high-intent leads and inbound conversations."
                                      : "For high-volume messaging (>100 people/day). Requires Meta verification."}
                                  </p>
                                </div>

                                <ul className="space-y-2 text-sm text-gray-600">
                                  {option.value === "qr" ? (
                                    <>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        No setup required
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        Instant connection
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        Daily limit: ~100 msgs
                                      </li>
                                    </>
                                  ) : (
                                    <>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                                        Business verification flow
                                      </li>
                                      <li className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                                        Unlimited messages & templates
                                      </li>
                                    </>
                                  )}
                                </ul>
                              </div>

                              <div
                                className={cn(
                                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                                  option.value === "qr"
                                    ? "bg-[rgba(254,144,29,0.14)]"
                                    : "bg-blue-100",
                                )}
                              >
                                {option.value === "qr" ? (
                                  <QrCode className="h-6 w-6 text-[#fe901d]" />
                                ) : (
                                  <Shield className="h-6 w-6 text-blue-600" />
                                )}
                              </div>
                            </div>
                          </SelectionCard>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_.9fr]">
                      <SelectionCard active className="cursor-default space-y-5 rounded-[22px] p-5">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
                            Scanning now
                          </p>
                          <h2 className="mt-1 text-2xl font-black text-gray-900">
                            {currentFlow === "sales" ? "Scan for Sales OS" : "Scan for Broadcast OS"}
                          </h2>
                          <p className="mt-1 text-sm text-gray-600">
                            Open WhatsApp {">"} Linked Devices {">"} Link a Device.
                          </p>
                        </div>

                        <div className="relative mx-auto h-[240px] w-[240px] overflow-hidden rounded-[20px] border border-[#e5e7eb] bg-white">
                          <div className="absolute inset-[14px] rounded-[14px] bg-[linear-gradient(135deg,#f8fafc,#ffffff)] opacity-90" />
                          <div className="absolute inset-[18px] z-10 grid place-items-center rounded-[12px] border border-dashed border-[#d1d5db] bg-white">
                            <QrCode className="h-28 w-28 text-[#fe901d]" strokeWidth={1.8} />
                          </div>
                          <div className="absolute left-4 right-4 top-6 z-20 h-[2px] animate-[pulse_2.2s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,#fe901d,transparent)] shadow-[0_0_18px_#fe901d]" />
                        </div>
                      </SelectionCard>

                      <SelectionCard active={false} className="cursor-default space-y-4 rounded-[22px] p-5">
                        <h3 className="text-lg font-bold text-gray-900">
                          {currentFlow === "sales" ? "Instant Revenue Engine" : "Instant Broadcast Engine"}
                        </h3>
                        <p className="text-sm text-gray-600">
                          QR is the fastest way to start today. You can always upgrade to the Official API later.
                        </p>
                        <button
                          className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[#d1d5db] bg-white px-5 py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed"
                          disabled={nextButtonBusy}
                          onClick={handleQrComplete}
                          type="button"
                        >
                          {nextButtonBusy ? "Saving..." : "Simulate scan complete"}
                          {nextButtonBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </button>
                      </SelectionCard>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#111827]"
                      onClick={() => {
                        setShowQrFlow(false);
                        setCurrentStep(1);
                      }}
                      type="button"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>

                    {!showQrFlow ? (
                      <button
                        className="inline-flex cursor-pointer items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,#fe901d,#ffb84d)] px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(254,144,29,0.3)] disabled:cursor-not-allowed"
                        disabled={nextButtonBusy}
                        onClick={handleWhatsappPrimaryAction}
                        type="button"
                      >
                        {nextButtonBusy
                          ? "Saving..."
                          : watchedValues.whatsappMode === "api"
                            ? "Setup Business API"
                            : "Continue with QR"}
                        {nextButtonBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : watchedValues.whatsappMode === "api" ? (
                          <ArrowRight className="h-4 w-4" />
                        ) : (
                          <QrCode className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {currentStep === 3 ? (
                <div className="space-y-6">
                  <div className="text-center space-y-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff1df] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.05em] text-[#c96a00]">
                      {flowCopy.flowLabel}
                    </span>
                    <h1 className="text-3xl font-black text-gray-900">
                      {flowCopy.step3Headline}
                    </h1>
                    <p className="mx-auto max-w-2xl text-gray-600">
                      {flowCopy.step3Description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_.95fr]">
                    <div className="space-y-6">
                      <SectionCard className="space-y-5">
                        <h2 className="text-base font-bold text-gray-900">
                          {flowCopy.leadRulesTitle}
                        </h2>

                        <div className="border-b border-[#e5e7eb] py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">
                                {flowCopy.saveChatsLabel}
                              </h3>
                              <p className="mt-1 text-xs text-gray-500">
                                {flowCopy.saveChatsDescription}
                              </p>
                            </div>
                            <button
                              className={cn(
                                "relative h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full transition",
                                watchedValues.saveNewChats
                                  ? "bg-[#fe901d]"
                                  : "bg-[#e5e7eb]",
                              )}
                              onClick={() =>
                                form.setValue(
                                  "saveNewChats",
                                  !watchedValues.saveNewChats,
                                  { shouldDirty: true },
                                )
                              }
                              type="button"
                            >
                              <span
                                className={cn(
                                  "absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition",
                                  watchedValues.saveNewChats ? "left-[23px]" : "left-[3px]",
                                )}
                              />
                            </button>
                          </div>
                        </div>

                        <div className="border-b border-[#e5e7eb] py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">
                                Auto-tag leads
                              </h3>
                              <p className="mt-1 text-xs text-gray-500">
                                Automatically classify prospects by intent and context.
                              </p>
                            </div>
                            <button
                              className={cn(
                                "relative h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full transition",
                                watchedValues.autoTag ? "bg-[#fe901d]" : "bg-[#e5e7eb]",
                              )}
                              onClick={() =>
                                form.setValue("autoTag", !watchedValues.autoTag, {
                                  shouldDirty: true,
                                })
                              }
                              type="button"
                            >
                              <span
                                className={cn(
                                  "absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition",
                                  watchedValues.autoTag ? "left-[23px]" : "left-[3px]",
                                )}
                              />
                            </button>
                          </div>
                        </div>

                        <div className="py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">
                                {flowCopy.notificationsLabel}
                              </h3>
                              <p className="mt-1 text-xs text-gray-500">
                                {flowCopy.notificationsDescription}
                              </p>
                            </div>
                            <button
                              className={cn(
                                "relative h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full transition",
                                watchedValues.notificationsEnabled
                                  ? "bg-[#fe901d]"
                                  : "bg-[#e5e7eb]",
                              )}
                              onClick={() =>
                                form.setValue(
                                  "notificationsEnabled",
                                  !watchedValues.notificationsEnabled,
                                  { shouldDirty: true },
                                )
                              }
                              type="button"
                            >
                              <span
                                className={cn(
                                  "absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition",
                                  watchedValues.notificationsEnabled
                                    ? "left-[23px]"
                                    : "left-[3px]",
                                )}
                              />
                            </button>
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard className="space-y-5">
                        <h2 className="text-base font-bold text-gray-900">
                          B. AI Setup (Business Context)
                        </h2>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                              {flowCopy.businessContextLabel}
                            </label>
                            <textarea
                              className="min-h-[92px] w-full resize-y rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#fe901d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(254,144,29,0.12)]"
                              placeholder={flowCopy.businessContextPlaceholder}
                              rows={3}
                              {...form.register("businessDescription")}
                            />
                            <FieldError
                              message={
                                form.formState.errors.businessDescription?.message
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                              {flowCopy.productsLabel}
                            </label>
                            <textarea
                              className="min-h-[92px] w-full resize-y rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#fe901d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(254,144,29,0.12)]"
                              placeholder={flowCopy.productsPlaceholder}
                              rows={3}
                              {...form.register("productsServices")}
                            />
                            <FieldError
                              message={
                                form.formState.errors.productsServices?.message
                              }
                            />
                          </div>
                        </div>
                      </SectionCard>

                      <SectionCard className="space-y-5">
                        <h2 className="text-base font-bold text-gray-900">
                          C. First AI Message
                        </h2>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-700">
                            Prefilled greeting
                          </label>
                          <textarea
                            className="min-h-[96px] w-full resize-y rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-sm text-[#111827] outline-none transition focus:border-[#fe901d] focus:bg-white focus:shadow-[0_0_0_3px_rgba(254,144,29,0.12)]"
                            placeholder={flowCopy.firstMessagePlaceholder}
                            rows={4}
                            {...form.register("firstAiMessage")}
                          />
                          <p className="text-xs text-gray-500">
                            Jennifer uses this tone as the opening message when new conversations start.
                          </p>
                        </div>
                      </SectionCard>
                    </div>

                    <aside className="space-y-6">
                      <SectionCard className="space-y-4">
                        <h2 className="text-base font-bold text-gray-900">
                          Engine Activation
                        </h2>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm font-bold text-gray-900">
                            {flowCopy.assistantName}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-gray-600">
                            {flowCopy.assistantDescription}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-[rgba(254,144,29,0.16)] bg-[rgba(254,144,29,0.08)] p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                Activate Jennifer (AI Auto-Reply)
                              </p>
                              <p className="mt-1 text-xs leading-5 text-gray-600">
                                n8n can read this flag before replying. If turned off, Jennifer stays silent.
                              </p>
                            </div>
                            <button
                              className={cn(
                                "relative h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full transition",
                                watchedValues.isAiActive
                                  ? "bg-[#fe901d]"
                                  : "bg-[#e5e7eb]",
                              )}
                              onClick={() =>
                                form.setValue("isAiActive", !watchedValues.isAiActive, {
                                  shouldDirty: true,
                                })
                              }
                              type="button"
                            >
                              <span
                                className={cn(
                                  "absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition",
                                  watchedValues.isAiActive ? "left-[23px]" : "left-[3px]",
                                )}
                              />
                            </button>
                          </div>
                        </div>
                      </SectionCard>
                    </aside>
                  </div>

                  <div className="flex flex-col items-center justify-between gap-4 pt-2 md:flex-row">
                    <button
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#111827] md:w-auto"
                      onClick={() => setCurrentStep(2)}
                      type="button"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>

                    <button
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,#fe901d,#ffb84d)] px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(254,144,29,0.3)] disabled:cursor-not-allowed md:w-auto"
                      disabled={nextButtonBusy}
                      onClick={handleAiContinue}
                      type="button"
                    >
                      {nextButtonBusy ? "Initializing..." : flowCopy.initButtonLabel}
                      {nextButtonBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Rocket className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ) : null}

              {currentStep === 4 ? (
                <div className="flex justify-center py-6">
                  <div className="w-full max-w-[580px] rounded-[32px] border border-[#e5e7eb] bg-white px-8 py-12 text-center shadow-[0_40px_100px_rgba(15,23,42,0.08)]">
                    <div className="relative mx-auto mb-8 flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#fff1df] text-[#fe901d]">
                      <CheckCircle2 className="h-10 w-10" strokeWidth={2.4} />
                      <div className="absolute inset-[-8px] rounded-full border-2 border-[#fff1df] animate-ping" />
                    </div>

                    <div className="space-y-3">
                      <h1 className="text-4xl font-black tracking-tight text-gray-900">
                        {flowCopy.completionTitle}
                      </h1>
                      <p className="text-lg leading-relaxed text-gray-600">
                        {flowCopy.completionDescription}
                      </p>
                    </div>

                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                          Leads
                        </p>
                        <p className="mt-1 font-bold text-gray-900">Active</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                          AI Rep
                        </p>
                        <p className="mt-1 font-bold text-gray-900">Training</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                          Dashboard
                        </p>
                        <p className="mt-1 font-bold text-gray-900">Unlocked</p>
                      </div>
                    </div>

                    <button
                      className="mt-8 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,#fe901d,#ffb84d)] px-6 py-4 text-lg font-bold text-white transition hover:-translate-y-px hover:shadow-[0_8px_20px_rgba(254,144,29,0.3)] disabled:cursor-not-allowed"
                      disabled={nextButtonBusy}
                      onClick={handleFinish}
                      type="button"
                    >
                      {nextButtonBusy ? "Unlocking..." : "Enter Dashboard"}
                      {nextButtonBusy ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Rocket className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>

      {showTrainingOverlay ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-[rgba(255,255,255,0.96)] backdrop-blur">
          <div className="h-[66px] w-[66px] animate-spin rounded-full border-4 border-[rgba(254,144,29,0.14)] border-t-[#fe901d]" />
          <h2 className="text-2xl font-black text-gray-900">{flowCopy.trainingTitle}</h2>
        </div>
      ) : null}
    </div>
  );
}
