import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Database,
  Flag,
  Link2,
  Loader2,
  Megaphone,
  QrCode,
  Rocket,
  Shield,
  Sparkles,
  Store,
  Target,
  Waypoints,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import {
  getOnboardingState,
  refreshWhatsAppQrStatus,
  saveOnboardingProgress,
  startWhatsAppQrHandshake,
  useQuery,
} from "wasp/client/operations";
import { routes } from "wasp/client/router";
import { type AuthUser } from "wasp/auth";
import * as z from "zod";
import { useToast } from "../../client/hooks/use-toast";
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
  type OnboardingFlow,
} from "./constants";
import { OnboardingCanvas } from "./OnboardingShell";

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
  1: ["businessName", "industry", "country"],
  2: ["primaryGoal"],
  3: ["trafficSources"],
  4: [],
  5: ["businessDescription", "productsServices", "firstAiMessage"],
  6: [],
};

const stepIcons = {
  1: Store,
  2: Target,
  3: Waypoints,
  4: Link2,
  5: Bot,
  6: Flag,
} as const;

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return <p className="text-sm font-medium text-red-600">{message}</p>;
}

function SurfaceCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-[#e8e4da] bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#121826]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ChoiceCard({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      className={cn(
        "block w-full cursor-pointer rounded-[22px] border-[1.5px] bg-white p-4 text-left transition hover:-translate-y-[1px] hover:shadow-[0_14px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#111827] dark:hover:shadow-[0_14px_30px_rgba(2,6,23,0.35)]",
        active
          ? "border-[#fe901d] bg-[linear-gradient(180deg,rgba(254,144,29,0.08),rgba(254,144,29,0.02))] dark:bg-[linear-gradient(180deg,rgba(254,144,29,0.14),rgba(254,144,29,0.05))]"
          : "border-[#e5e7eb]",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function Toggle({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "relative h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full transition",
        checked ? "bg-[#fe901d]" : "bg-[#e5e7eb] dark:bg-slate-700",
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          "absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition",
          checked ? "left-[23px]" : "left-[3px]",
        )}
      />
    </button>
  );
}

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl items-center px-4">
      {onboardingSteps.map((step, index) => {
        const Icon = stepIcons[step.step as keyof typeof stepIcons];
        const isDone = currentStep > step.step;
        const isActive = currentStep === step.step;

        return (
          <div key={step.step} className="flex flex-1 items-center">
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 transition",
                isDone
                  ? "border-[#fe901d] bg-white text-[#fe901d] dark:bg-[#0f172a]"
                  : isActive
                    ? "border-[#fe901d] bg-[#fe901d] text-white"
                    : "border-[#e5e7eb] bg-white text-[#c7c7c7] dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-500",
              )}
            >
              {isDone ? (
                <Check className="h-5 w-5" strokeWidth={3} />
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </div>
            {index < onboardingSteps.length - 1 ? (
              <div
                className={cn(
                  "h-[2px] flex-1 transition-colors",
                  currentStep > step.step
                    ? "bg-[#fe901d]"
                    : "bg-[#e5e7eb] dark:bg-white/10",
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function getStepIntro(step: number, flow: OnboardingFlow) {
  const flowCopy = onboardingFlowContent[flow];

  switch (step) {
    case 1:
      return {
        pill: flow === "sales" ? "Sales OS Setup" : "Broadcast OS Setup",
        title: "Business and goal setup",
        description:
          "We will capture your business context, revenue goal, and lead sources before training the AI sales rep.",
      };
    case 2:
      return {
        pill: flowCopy.flowLabel,
        title: "Pick your revenue goal",
        description:
          "Choose the main outcome this workspace should optimize before we connect WhatsApp.",
      };
    case 3:
      return {
        pill: flowCopy.flowLabel,
        title: "Map your traffic sources",
        description:
          "Tell QuicReply where conversations begin so reporting and Jennifer stay in context.",
      };
    case 4:
      return {
        pill: flowCopy.flowLabel,
        title: "Connect your WhatsApp",
        description:
          "Choose how to link your number. QR is instant for speed, while API is built for heavier scaling.",
      };
    case 5:
      return {
        pill: flowCopy.flowLabel,
        title: "AI & Lead Engine Setup",
        description:
          "Configure lead capture rules and train Jennifer with the context of your offer.",
      };
    case 6:
      return {
        pill: flowCopy.flowLabel,
        title: flowCopy.completionTitle,
        description: flowCopy.completionDescription,
      };
    default:
      return {
        pill: flowCopy.flowLabel,
        title: onboardingSteps[0].headline,
        description: onboardingSteps[0].description,
      };
  }
}

function getTopbarTitle(step: number) {
  switch (step) {
    case 1:
      return "Onboarding · Business Setup";
    case 2:
      return "Onboarding · Revenue Goal";
    case 3:
      return "Onboarding · Traffic Sources";
    case 4:
      return "Onboarding · Connect WhatsApp";
    case 5:
      return "Onboarding · AI Setup";
    case 6:
      return "Onboarding · Completion";
    default:
      return "Onboarding";
  }
}

type OnboardingQrStatus =
  | "disconnected"
  | "pending"
  | "connected"
  | "expired"
  | "failed";

type OnboardingQrState = {
  status: OnboardingQrStatus;
  connected: boolean;
  codeData: string | null;
  sessionId: string | null;
  deviceInfo: string | null;
  lastSeen: string | null;
  checkedAt: string | null;
  lastError: string | null;
};

type WhatsAppWorkspaceState = {
  qr: OnboardingQrState;
};

function getQrImageSrc(codeData: string | null) {
  if (!codeData) {
    return null;
  }

  if (codeData.startsWith("data:image")) {
    return codeData;
  }

  if (/^https?:\/\//i.test(codeData)) {
    return codeData;
  }

  return `data:image/png;base64,${codeData}`;
}

export default function OnboardingPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery(getOnboardingState);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [showQrFlow, setShowQrFlow] = useState(false);
  const [onboardingQrState, setOnboardingQrState] =
    useState<OnboardingQrState | null>(null);
  const [isStartingQr, setIsStartingQr] = useState(false);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [showTrainingOverlay, setShowTrainingOverlay] = useState(false);
  const qrPollInFlightRef = useRef(false);
  const qrCompletionHandledRef = useRef(false);
  const isOnboardingCompleted =
    (user as AuthUser & { onboardingCompleted?: boolean })
      .onboardingCompleted === true;

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues,
    mode: "onTouched",
  });

  const watchedValues = form.watch();
  const currentFlow = watchedValues.flow;
  const flowCopy = onboardingFlowContent[currentFlow];
  const intro = useMemo(
    () => getStepIntro(currentStep, currentFlow),
    [currentFlow, currentStep],
  );

  useEffect(() => {
    if (isOnboardingCompleted || data?.onboardingCompleted) {
      navigate(routes.UserPageRoute.to, { replace: true });
    }
  }, [data?.onboardingCompleted, isOnboardingCompleted, navigate]);

  useEffect(() => {
    if (!data) {
      return;
    }

    const nextStep = Math.min(Math.max(data.onboardingStep || 1, 1), 6);
    setCurrentStep(nextStep);

    if (!data.organization) {
      setShowQrFlow(false);
      return;
    }

    form.reset({
      flow:
        (data.organization.flow as OnboardingFormValues["flow"]) ??
        defaultValues.flow,
      businessName: data.organization.name ?? "",
      phoneNumber: data.organization.phoneNumber ?? "",
      industry: data.organization.industry ?? "",
      country: data.organization.country ?? "",
      primaryGoal:
        (data.organization
          .primaryGoal as OnboardingFormValues["primaryGoal"]) ??
        defaultValues.primaryGoal,
      trafficSources:
        (data.organization.trafficSources.filter((source) =>
          trafficSourceValues.includes(
            source as (typeof trafficSourceValues)[number],
          ),
        ) as OnboardingFormValues["trafficSources"]) ?? [],
      whatsappMode:
        (data.organization
          .whatsappMode as OnboardingFormValues["whatsappMode"]) ??
        defaultValues.whatsappMode,
      qrConnected: data.organization.qrConnected ?? false,
      apiStatus:
        (data.organization.apiStatus as OnboardingFormValues["apiStatus"]) ??
        defaultValues.apiStatus,
      saveNewChats: data.organization.settings.saveNewChats,
      autoTag: data.organization.settings.autoTag,
      notificationsEnabled: data.organization.settings.notificationsEnabled,
      businessDescription: data.organization.businessDescription ?? "",
      productsServices: data.organization.productsServices ?? "",
      firstAiMessage:
        data.organization.firstAiMessage || defaultValues.firstAiMessage,
      isAiActive: data.organization.isAiActive ?? defaultValues.isAiActive,
    });

    const existingQrConnected = Boolean(data.organization.qrConnected);
    setOnboardingQrState(
      existingQrConnected
        ? {
            status: "connected",
            connected: true,
            codeData: null,
            sessionId: null,
            deviceInfo: data.organization.name ?? null,
            lastSeen: null,
            checkedAt: null,
            lastError: null,
          }
        : null,
    );
    qrCompletionHandledRef.current = existingQrConnected;
    setShowQrFlow(nextStep === 4 && existingQrConnected);
  }, [data, form]);

  async function persistStep(
    step: number,
    complete = false,
    validationStep = step,
    overrides: Partial<OnboardingFormValues> = {},
  ) {
    setIsSavingStep(true);
    try {
      await saveOnboardingProgress({
        ...form.getValues(),
        ...overrides,
        step,
        validationStep,
        complete,
      });
      return true;
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: complete
          ? "Could not finish onboarding"
          : "Could not save this step",
        description: err?.message || "Please try again.",
      });
      return false;
    } finally {
      setIsSavingStep(false);
    }
  }

  async function saveAndGo(step: number, nextStep: number) {
    const isValid = await form.trigger(stepFields[step], { shouldFocus: true });
    if (!isValid) {
      return;
    }
    const saved = await persistStep(nextStep, false, step);
    if (!saved) {
      return;
    }
    setCurrentStep(nextStep);
  }

  async function handleQrConnected(nextQrState = onboardingQrState) {
    if (qrCompletionHandledRef.current && currentStep === 5) {
      return true;
    }

    qrCompletionHandledRef.current = true;
    form.setValue("whatsappMode", "qr", { shouldDirty: true });
    form.setValue("qrConnected", true, { shouldDirty: true });
    form.setValue("apiStatus", "none", { shouldDirty: true });

    const saved = await persistStep(5, false, 4, {
      whatsappMode: "qr",
      qrConnected: true,
      apiStatus: "none",
    });

    if (!saved) {
      qrCompletionHandledRef.current = false;
      return false;
    }

    if (nextQrState) {
      setOnboardingQrState(nextQrState);
    }

    toast({
      title: "WhatsApp connected",
      description: "Your instant WhatsApp engine is ready.",
    });
    setShowQrFlow(false);
    setCurrentStep(5);
    return true;
  }

  async function startOnboardingQrHandshake() {
    setIsStartingQr(true);
    qrCompletionHandledRef.current = false;

    try {
      const nextState = (await startWhatsAppQrHandshake({
        forceFresh: true,
      })) as WhatsAppWorkspaceState;
      setOnboardingQrState(nextState.qr);
      setShowQrFlow(true);

      if (nextState.qr.status === "connected" || nextState.qr.connected) {
        await handleQrConnected(nextState.qr);
        return;
      }

      toast({
        title: nextState.qr.codeData
          ? "QR ready to scan"
          : "QR session started",
        description: nextState.qr.codeData
          ? "Open WhatsApp > Linked Devices > Link a Device."
          : "Evolution is preparing the QR. Refresh in a moment.",
      });
    } catch (err: any) {
      setOnboardingQrState((current) => ({
        status: "failed",
        connected: false,
        codeData: null,
        sessionId: current?.sessionId ?? null,
        deviceInfo: current?.deviceInfo ?? null,
        lastSeen: current?.lastSeen ?? null,
        checkedAt: current?.checkedAt ?? null,
        lastError: err?.message || "Could not start QR session.",
      }));
      toast({
        variant: "destructive",
        title: "Could not start WhatsApp QR",
        description: err?.message || "Please try again.",
      });
    } finally {
      setIsStartingQr(false);
    }
  }

  async function refreshOnboardingQrStatus(showToast = true) {
    setIsRefreshingQr(true);

    try {
      const nextState = (await refreshWhatsAppQrStatus(
        {},
      )) as WhatsAppWorkspaceState;
      setOnboardingQrState(nextState.qr);

      if (nextState.qr.status === "connected" || nextState.qr.connected) {
        await handleQrConnected(nextState.qr);
        return;
      }

      if (showToast) {
        toast({
          title: "QR status refreshed",
          description: nextState.qr.codeData
            ? "Scan the latest QR code to finish linking."
            : "Evolution is still preparing the QR.",
        });
      }
    } catch (err: any) {
      setOnboardingQrState((current) =>
        current
          ? {
              ...current,
              status: "failed",
              lastError: err?.message || "Could not refresh QR status.",
            }
          : current,
      );
      if (showToast) {
        toast({
          variant: "destructive",
          title: "Could not refresh QR status",
          description: err?.message || "Please try again.",
        });
      }
    } finally {
      setIsRefreshingQr(false);
    }
  }

  async function handleWhatsappPrimaryAction() {
    if (watchedValues.whatsappMode === "api") {
      form.setValue("whatsappMode", "api", { shouldDirty: true });
      form.setValue("apiStatus", "pending", { shouldDirty: true });
      form.setValue("qrConnected", false, { shouldDirty: true });
      const saved = await persistStep(4, false, 4, {
        whatsappMode: "api",
        apiStatus: "pending",
        qrConnected: false,
      });
      if (!saved) {
        return;
      }
      navigate("/whatsapp/setup");
      return;
    }

    form.setValue("whatsappMode", "qr", { shouldDirty: true });
    form.setValue("apiStatus", "none", { shouldDirty: true });
    form.setValue("qrConnected", false, { shouldDirty: true });
    const saved = await persistStep(4, false, 4, {
      whatsappMode: "qr",
      apiStatus: "none",
      qrConnected: false,
    });
    if (!saved) {
      return;
    }

    setShowQrFlow(true);
    await startOnboardingQrHandshake();
  }

  useEffect(() => {
    if (
      !showQrFlow ||
      onboardingQrState?.status !== "pending" ||
      !onboardingQrState.sessionId
    ) {
      return;
    }

    let isCancelled = false;
    const intervalId = window.setInterval(async () => {
      if (qrPollInFlightRef.current) {
        return;
      }

      qrPollInFlightRef.current = true;
      try {
        const nextState = (await refreshWhatsAppQrStatus(
          {},
        )) as WhatsAppWorkspaceState;
        if (isCancelled) {
          return;
        }

        setOnboardingQrState(nextState.qr);
        if (
          (nextState.qr.status === "connected" || nextState.qr.connected) &&
          !qrCompletionHandledRef.current
        ) {
          await handleQrConnected(nextState.qr);
        }
      } catch (err: any) {
        if (!isCancelled) {
          setOnboardingQrState((current) =>
            current
              ? {
                  ...current,
                  status: "failed",
                  lastError: err?.message || "Could not refresh QR status.",
                }
              : current,
          );
        }
      } finally {
        qrPollInFlightRef.current = false;
      }
    }, 5000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [showQrFlow, onboardingQrState?.sessionId, onboardingQrState?.status]);

  async function handleAiContinue() {
    const isValid = await form.trigger(stepFields[5], { shouldFocus: true });
    if (!isValid) {
      return;
    }
    setShowTrainingOverlay(true);
    window.setTimeout(async () => {
      const saved = await persistStep(6, false, 5);
      setShowTrainingOverlay(false);
      if (saved) {
        setCurrentStep(6);
      }
    }, 2400);
  }

  async function handleFinish() {
    const saved = await persistStep(6, true);
    if (!saved) {
      return;
    }
    toast({
      title: "Revenue engine primed",
      description: "Unlocking your dashboard now.",
    });
    window.location.assign(routes.UserPageRoute.to);
  }

  const qrStatus =
    onboardingQrState?.status ??
    (watchedValues.qrConnected ? "connected" : "disconnected");
  const qrImageSrc = useMemo(
    () => getQrImageSrc(onboardingQrState?.codeData ?? null),
    [onboardingQrState?.codeData],
  );
  const qrIsConnected =
    qrStatus === "connected" ||
    Boolean(onboardingQrState?.connected) ||
    watchedValues.qrConnected;
  const qrIsPending = qrStatus === "pending";
  const qrStatusLabel = qrIsConnected
    ? "Connected"
    : qrIsPending
      ? "Scanning now"
      : qrStatus === "failed"
        ? "Needs attention"
        : qrStatus === "expired"
          ? "Expired"
          : "Ready to scan";
  const qrPrimaryActionLabel = qrIsConnected
    ? "Continue to AI + Lead Engine"
    : !onboardingQrState?.sessionId ||
        qrStatus === "failed" ||
        qrStatus === "expired"
      ? "Generate QR"
      : "Refresh QR status";
  const buttonBusy =
    isSavingStep || showTrainingOverlay || isStartingQr || isRefreshingQr;
  const inputClass =
    "w-full rounded-[14px] border border-[#e5e7eb] bg-[#fbfaf7] px-4 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af] placeholder:opacity-100 outline-none transition focus:border-[#fe901d] focus:bg-white focus:shadow-[0_0_0_4px_rgba(254,144,29,0.12)] dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-[#111827]";
  const ghostButtonClass =
    "inline-flex w-full cursor-pointer items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm font-medium text-[#6b7280] transition hover:bg-[#f3f4f6] hover:text-[#111827] dark:text-slate-300/70 dark:hover:bg-white/5 dark:hover:text-slate-100 md:w-auto";
  const primaryButtonClass =
    "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(135deg,#fe901d,#ffb84d)] px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-px hover:shadow-[0_14px_28px_rgba(254,144,29,0.28)] disabled:cursor-not-allowed md:w-auto";

  const stepHeader = (
    <div className="space-y-6 text-center">
      <Stepper currentStep={currentStep} />
      <div className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#ece8df] bg-white px-4 py-2 text-sm font-semibold text-[#5f5e5e] shadow-[0_10px_28px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-[#111827]/92 dark:text-slate-300 dark:shadow-[0_10px_28px_rgba(2,6,23,0.4)]">
          <BriefcaseBusiness className="h-4 w-4 text-[#fe901d]" />
          {intro.pill}
        </span>
        <h2 className="mx-auto max-w-3xl text-3xl font-black tracking-tight text-[#161d2f] dark:text-slate-50 md:text-4xl">
          {intro.title}
        </h2>
        <p className="mx-auto max-w-2xl text-base leading-7 text-[#6b7280] dark:text-slate-300/75">
          {intro.description}
        </p>
      </div>
    </div>
  );

  const renderStepOne = (
    <SurfaceCard className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#f1efe8] pb-5 dark:border-white/10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#a58f72]">
            Step 1 of 6
          </p>
          <h3 className="mt-2 text-3xl font-black text-[#161d2f] dark:text-slate-50">
            Business Info
          </h3>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[#6b7280] dark:text-slate-300/75">
            Set the business identity that will shape the rest of your
            onboarding.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#fe901d]" />
              <h4 className="text-base font-bold text-[#161d2f] dark:text-slate-100">
                Choose your engine
              </h4>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {onboardingFlowOptions.map((option) => {
                const selected = currentFlow === option.value;
                return (
                  <ChoiceCard
                    key={option.value}
                    active={selected}
                    onClick={() => {
                      const previousFlow = form.getValues("flow");
                      const previousDefault =
                        onboardingFlowContent[previousFlow]
                          .firstMessagePlaceholder;
                      const nextDefault =
                        onboardingFlowContent[option.value]
                          .firstMessagePlaceholder;

                      form.setValue("flow", option.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });

                      const currentMessage = form.getValues("firstAiMessage");
                      if (
                        !currentMessage ||
                        currentMessage === previousDefault
                      ) {
                        form.setValue("firstAiMessage", nextDefault, {
                          shouldDirty: true,
                        });
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]",
                            option.value === "sales"
                              ? "bg-[#fff1df] text-[#c96a00]"
                              : "bg-[#e7f0ff] text-[#315fcb]",
                          )}
                        >
                          {option.eyebrow}
                        </span>
                        <div>
                          <h3 className="text-lg font-bold text-[#161d2f] dark:text-slate-100">
                            {option.label}
                          </h3>
                          <p className="mt-1 text-sm text-[#6b7280] dark:text-slate-300/75">
                            {option.description}
                          </p>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                          option.value === "sales"
                            ? "bg-[rgba(254,144,29,0.14)] text-[#fe901d]"
                            : "bg-[#e7f0ff] text-[#315fcb]",
                        )}
                      >
                        {option.value === "sales" ? (
                          <Bot className="h-5 w-5" />
                        ) : (
                          <Megaphone className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </ChoiceCard>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 border-t border-[#f1efe8] pt-6 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-[#fe901d]" />
              <h4 className="text-base font-bold text-[#161d2f] dark:text-slate-100">
                A. Business Info
              </h4>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#374151] dark:text-slate-200">
                  Business Name
                </label>
                <input
                  autoComplete="organization"
                  className={inputClass}
                  placeholder="Enter business name"
                  {...form.register("businessName")}
                />
                <FieldError
                  message={form.formState.errors.businessName?.message}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#374151] dark:text-slate-200">
                  Phone Number
                </label>
                <input
                  autoComplete="tel"
                  className={inputClass}
                  placeholder="Enter phone number"
                  {...form.register("phoneNumber")}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#374151] dark:text-slate-200">
                  Industry
                </label>
                <select className={inputClass} {...form.register("industry")}>
                  <option value="">Select industry</option>
                  {industryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FieldError message={form.formState.errors.industry?.message} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#374151] dark:text-slate-200">
                  Country
                </label>
                <select className={inputClass} {...form.register("country")}>
                  <option value="">Select country</option>
                  {countryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <FieldError message={form.formState.errors.country?.message} />
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <SurfaceCard className="space-y-4 rounded-[22px]">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-[#fe901d]" />
              <h4 className="text-base font-bold text-[#161d2f] dark:text-slate-100">
                Revenue OS Profile
              </h4>
            </div>
            <ul className="space-y-3 text-sm text-[#6b7280] dark:text-slate-300/75">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  <strong className="text-[#161d2f] dark:text-slate-100">
                    org.name
                  </strong>
                  : Business identity.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  <strong className="text-[#161d2f] dark:text-slate-100">
                    org.primaryGoal
                  </strong>
                  : Revenue outcome.
                </span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  <strong className="text-[#161d2f] dark:text-slate-100">
                    org.trafficSources
                  </strong>
                  : Funnel entry points.
                </span>
              </li>
            </ul>
          </SurfaceCard>

          <SurfaceCard className="rounded-[22px] bg-[#fffaf0] dark:bg-[rgba(254,144,29,0.08)]">
            <p className="text-sm text-[#6b7280] dark:text-slate-300/75">
              {flowCopy.step1Tip}
            </p>
          </SurfaceCard>
        </aside>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 pt-2 md:flex-row">
        <button
          className={ghostButtonClass}
          onClick={() => navigate("/")}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          className={primaryButtonClass}
          disabled={buttonBusy}
          onClick={() => void saveAndGo(1, 2)}
          type="button"
        >
          {buttonBusy ? "Saving..." : "Continue to Revenue Goal"}
          {buttonBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </SurfaceCard>
  );

  const renderStepTwo = (
    <SurfaceCard className="space-y-6">
      <div className="border-b border-[#f1efe8] pb-5 dark:border-white/10">
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#a58f72]">
          Step 2 of 6
        </p>
        <h3 className="mt-2 text-3xl font-black text-[#161d2f] dark:text-slate-50">
          Revenue Goal
        </h3>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[#6b7280] dark:text-slate-300/75">
          Pick the core outcome you want QuicReply to optimize first.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {primaryGoalOptions.map((option) => {
          const selected = watchedValues.primaryGoal === option.value;
          return (
            <ChoiceCard
              key={option.value}
              active={selected}
              onClick={() =>
                form.setValue("primaryGoal", option.value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <div className="font-semibold text-[#161d2f] dark:text-slate-100">
                {option.label}
              </div>
              <p className="mt-1 text-sm text-[#6b7280] dark:text-slate-300/75">
                {option.description}
              </p>
            </ChoiceCard>
          );
        })}
      </div>
      <FieldError message={form.formState.errors.primaryGoal?.message} />

      <div className="flex flex-col items-center justify-between gap-4 pt-2 md:flex-row">
        <button
          className={ghostButtonClass}
          onClick={() => setCurrentStep(1)}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          className={primaryButtonClass}
          disabled={buttonBusy}
          onClick={() => void saveAndGo(2, 3)}
          type="button"
        >
          {buttonBusy ? "Saving..." : "Continue to Traffic Sources"}
          {buttonBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </SurfaceCard>
  );

  const renderStepThree = (
    <SurfaceCard className="space-y-6">
      <div className="border-b border-[#f1efe8] pb-5 dark:border-white/10">
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#a58f72]">
          Step 3 of 6
        </p>
        <h3 className="mt-2 text-3xl font-black text-[#161d2f] dark:text-slate-50">
          Traffic Sources
        </h3>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[#6b7280] dark:text-slate-300/75">
          Select the source types that usually bring conversations into this
          workspace.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {trafficSourceOptions.map((option) => {
          const selected = watchedValues.trafficSources.includes(option.value);
          return (
            <ChoiceCard
              key={option.value}
              active={selected}
              onClick={() => {
                const nextSources = selected
                  ? watchedValues.trafficSources.filter(
                      (value) => value !== option.value,
                    )
                  : [...watchedValues.trafficSources, option.value];
                form.setValue("trafficSources", nextSources, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            >
              <div className="font-semibold text-[#161d2f] dark:text-slate-100">
                {option.label}
              </div>
              <p className="mt-1 text-sm text-[#6b7280] dark:text-slate-300/75">
                {option.value === "ads"
                  ? "Facebook, Instagram, Google, or TikTok traffic."
                  : option.value === "website"
                    ? "Landing pages, forms, and website enquiries."
                    : option.value === "whatsapp"
                      ? "Existing conversations and direct replies."
                      : "Any additional source you want to track."}
              </p>
            </ChoiceCard>
          );
        })}
      </div>
      <FieldError
        message={
          form.formState.errors.trafficSources?.message as string | undefined
        }
      />

      <div className="flex flex-col items-center justify-between gap-4 pt-2 md:flex-row">
        <button
          className={ghostButtonClass}
          onClick={() => setCurrentStep(2)}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          className={primaryButtonClass}
          disabled={buttonBusy}
          onClick={() => void saveAndGo(3, 4)}
          type="button"
        >
          {buttonBusy ? "Saving..." : "Continue to WhatsApp"}
          {buttonBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </SurfaceCard>
  );

  const renderStepFour = (
    <SurfaceCard className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#f1efe8] pb-5 dark:border-white/10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#a58f72]">
            Step 4 of 6
          </p>
          <h3 className="mt-2 text-3xl font-black text-[#161d2f] dark:text-slate-50">
            WhatsApp Connection
          </h3>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[#6b7280] dark:text-slate-300/75">
            Choose how to link your number. QR is highlighted as the default
            fast path.
          </p>
        </div>
        <div className="rounded-2xl bg-[#fff8ec] px-5 py-3 text-right dark:bg-[rgba(254,144,29,0.08)]">
          <div className="h-2 w-28 rounded-full bg-[#f0e9dd] dark:bg-white/10">
            <div className="h-2 w-2/3 rounded-full bg-[#fe901d]" />
          </div>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-[#b58b53]">
            67% Ready
          </p>
        </div>
      </div>

      {!showQrFlow ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {whatsappModeOptions.map((option) => {
              const selected = watchedValues.whatsappMode === option.value;
              return (
                <ChoiceCard
                  key={option.value}
                  active={selected}
                  className="p-5"
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
                          {option.eyebrow}
                        </span>
                        <span className="rounded-full bg-[#fff8ec] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#fe901d] dark:bg-[rgba(254,144,29,0.10)]">
                          {option.badge}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-[#161d2f] dark:text-slate-100">
                          {option.label}
                        </h4>
                        <p className="mt-2 max-w-2xl text-base leading-7 text-[#6b7280] dark:text-slate-300/75">
                          {option.description}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-[#7b6b55] dark:text-slate-300/70">
                        CTA: {option.cta}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                        option.value === "qr"
                          ? "bg-[rgba(254,144,29,0.14)] text-[#fe901d]"
                          : "bg-[#e7f0ff] text-[#315fcb]",
                      )}
                    >
                      {option.value === "qr" ? (
                        <QrCode className="h-6 w-6" />
                      ) : (
                        <Shield className="h-6 w-6" />
                      )}
                    </div>
                  </div>
                </ChoiceCard>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_.9fr]">
          <div className="space-y-5 rounded-[24px] border-[1.5px] border-[#fe901d] bg-[linear-gradient(135deg,rgba(254,144,29,0.10),rgba(255,255,255,0.94))] p-5 text-left transition dark:bg-[linear-gradient(135deg,rgba(254,144,29,0.14),rgba(15,23,42,0.94))]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#a58f72]">
                {qrStatusLabel}
              </p>
              <h4 className="mt-2 text-2xl font-black text-[#161d2f] dark:text-slate-100">
                {currentFlow === "sales"
                  ? "Scan for Sales OS"
                  : "Scan for Broadcast OS"}
              </h4>
              <p className="mt-1 text-sm text-[#6b7280] dark:text-slate-300/75">
                Open WhatsApp &gt; Linked Devices &gt; Link a Device.
              </p>
            </div>

            {onboardingQrState?.lastError || (qrIsPending && !qrImageSrc) ? (
              <div className="rounded-[14px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-200">
                {onboardingQrState?.lastError ??
                  "Evolution is preparing the QR code. Please refresh in a moment."}
              </div>
            ) : null}

            <div className="relative mx-auto h-[240px] w-[240px] overflow-hidden rounded-[24px] border border-[#ece8df] bg-white dark:border-white/10 dark:bg-[#0f172a]">
              <div className="absolute inset-[14px] rounded-[16px] bg-[linear-gradient(135deg,#fffaf0,#ffffff)] opacity-90 dark:bg-[linear-gradient(135deg,#111827,#0f172a)]" />
              <div className="absolute inset-[18px] z-10 grid place-items-center rounded-[16px] border border-dashed border-[#d9d3c5] bg-white dark:border-white/15 dark:bg-[#111827]">
                {qrImageSrc ? (
                  <img
                    alt="WhatsApp QR code"
                    className="h-full w-full rounded-[14px] object-contain p-2"
                    src={qrImageSrc}
                  />
                ) : qrIsConnected ? (
                  <div className="grid place-items-center gap-3 text-center">
                    <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                    <div>
                      <p className="text-sm font-bold text-[#161d2f] dark:text-slate-100">
                        Connected
                      </p>
                      <p className="mt-1 max-w-[160px] text-xs text-[#6b7280] dark:text-slate-300/75">
                        QR is hidden after a successful link.
                      </p>
                    </div>
                  </div>
                ) : isStartingQr || qrIsPending || isRefreshingQr ? (
                  <div className="grid place-items-center gap-3 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-[#fe901d]" />
                    <p className="max-w-[160px] text-xs font-semibold text-[#6b7280] dark:text-slate-300/75">
                      Preparing QR...
                    </p>
                  </div>
                ) : (
                  <div className="grid place-items-center gap-3 text-center">
                    <QrCode
                      className="h-20 w-20 text-[#fe901d]"
                      strokeWidth={1.8}
                    />
                    <p className="max-w-[160px] text-xs font-semibold text-[#6b7280] dark:text-slate-300/75">
                      Generate a QR session to link WhatsApp.
                    </p>
                  </div>
                )}
              </div>
              {qrImageSrc && qrIsPending ? (
                <div className="absolute left-4 right-4 top-6 z-20 h-[2px] animate-[pulse_2.2s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,#fe901d,transparent)] shadow-[0_0_18px_#fe901d]" />
              ) : null}
            </div>
          </div>

          <div className="space-y-4 rounded-[24px] border-[1.5px] border-[#e5e7eb] bg-white p-5 text-left transition dark:border-white/10 dark:bg-[#111827]">
            <h4 className="text-xl font-black text-[#161d2f] dark:text-slate-100">
              {currentFlow === "sales"
                ? "Instant Revenue Engine"
                : "Instant Broadcast Engine"}
            </h4>
            <p className="text-sm leading-7 text-[#6b7280] dark:text-slate-300/75">
              QR is the fastest way to start today. You can always upgrade to
              the Official API later.
            </p>
            <div className="rounded-[16px] border border-[#e5e7eb] bg-[#fbfaf7] p-4 text-sm text-[#6b7280] dark:border-white/10 dark:bg-[#0f172a] dark:text-slate-300/75">
              <p className="font-semibold text-[#161d2f] dark:text-slate-100">
                Status: {qrStatusLabel}
              </p>
              {onboardingQrState?.sessionId ? (
                <p className="mt-1 break-all">
                  Session: {onboardingQrState.sessionId}
                </p>
              ) : null}
              {onboardingQrState?.lastSeen ? (
                <p className="mt-1">
                  Last seen:{" "}
                  {new Date(onboardingQrState.lastSeen).toLocaleString()}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[#d1d5db] bg-white px-5 py-2.5 text-sm font-semibold text-[#374151] transition hover:bg-[#f9fafb] disabled:cursor-not-allowed dark:border-white/10 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-white/5"
                disabled={buttonBusy}
                onClick={() => {
                  if (qrIsConnected) {
                    void handleQrConnected(onboardingQrState);
                    return;
                  }
                  if (
                    !onboardingQrState?.sessionId ||
                    qrStatus === "failed" ||
                    qrStatus === "expired"
                  ) {
                    void startOnboardingQrHandshake();
                    return;
                  }
                  void refreshOnboardingQrStatus();
                }}
                type="button"
              >
                {buttonBusy ? "Working..." : qrPrimaryActionLabel}
                {buttonBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : qrIsConnected ? (
                  <ArrowRight className="h-4 w-4" />
                ) : (
                  <QrCode className="h-4 w-4" />
                )}
              </button>
              {onboardingQrState?.sessionId && !qrIsConnected ? (
                <button
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-[12px] px-5 py-2.5 text-sm font-semibold text-[#7b6b55] transition hover:bg-[#fff8ec] disabled:cursor-not-allowed dark:text-slate-300 dark:hover:bg-white/5"
                  disabled={buttonBusy}
                  onClick={() => void startOnboardingQrHandshake()}
                  type="button"
                >
                  Generate fresh QR
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          className={ghostButtonClass}
          onClick={() => {
            setShowQrFlow(false);
            setCurrentStep(3);
          }}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {!showQrFlow ? (
          <button
            className={primaryButtonClass}
            disabled={buttonBusy}
            onClick={handleWhatsappPrimaryAction}
            type="button"
          >
            {buttonBusy
              ? "Saving..."
              : watchedValues.whatsappMode === "api"
                ? "Setup Business API"
                : "Continue with QR"}
            {buttonBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : watchedValues.whatsappMode === "api" ? (
              <ArrowRight className="h-4 w-4" />
            ) : (
              <QrCode className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>
    </SurfaceCard>
  );

  const renderStepFive = (
    <SurfaceCard className="space-y-6">
      <div className="border-b border-[#f1efe8] pb-5 dark:border-white/10">
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#a58f72]">
          Step 5 of 6
        </p>
        <h3 className="mt-2 text-3xl font-black text-[#161d2f] dark:text-slate-50">
          AI & Lead Engine Setup
        </h3>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[#6b7280] dark:text-slate-300/75">
          Configure your lead capture rules and train Jennifer with the context
          of your offer.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
        <div className="space-y-6">
          <SurfaceCard className="space-y-5 rounded-[22px] border-[#f1efe8] dark:border-white/10">
            <h4 className="text-base font-bold text-[#161d2f] dark:text-slate-100">
              A. Lead Capture Rules
            </h4>
            <div className="flex items-center justify-between gap-4 border-b border-[#ece8df] py-3 dark:border-white/10">
              <div>
                <h5 className="text-sm font-semibold text-[#161d2f] dark:text-slate-100">
                  {flowCopy.saveChatsLabel}
                </h5>
                <p className="mt-1 text-xs text-[#6b7280] dark:text-slate-300/75">
                  {flowCopy.saveChatsDescription}
                </p>
              </div>
              <Toggle
                checked={watchedValues.saveNewChats}
                onClick={() =>
                  form.setValue("saveNewChats", !watchedValues.saveNewChats, {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-[#ece8df] py-3 dark:border-white/10">
              <div>
                <h5 className="text-sm font-semibold text-[#161d2f] dark:text-slate-100">
                  Auto-tag leads
                </h5>
                <p className="mt-1 text-xs text-[#6b7280] dark:text-slate-300/75">
                  Automatically tag chats based on intent and activity.
                </p>
              </div>
              <Toggle
                checked={watchedValues.autoTag}
                onClick={() =>
                  form.setValue("autoTag", !watchedValues.autoTag, {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between gap-4 pt-3">
              <div>
                <h5 className="text-sm font-semibold text-[#161d2f] dark:text-slate-100">
                  {flowCopy.notificationsLabel}
                </h5>
                <p className="mt-1 text-xs text-[#6b7280] dark:text-slate-300/75">
                  {flowCopy.notificationsDescription}
                </p>
              </div>
              <Toggle
                checked={watchedValues.notificationsEnabled}
                onClick={() =>
                  form.setValue(
                    "notificationsEnabled",
                    !watchedValues.notificationsEnabled,
                    {
                      shouldDirty: true,
                    },
                  )
                }
              />
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-5 rounded-[22px] border-[#f1efe8] dark:border-white/10">
            <h4 className="text-base font-bold text-[#161d2f] dark:text-slate-100">
              B. AI Setup (Business Context)
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#374151] dark:text-slate-200">
                  {flowCopy.businessContextLabel}
                </label>
                <textarea
                  className={inputClass + " min-h-[96px] resize-y"}
                  placeholder={flowCopy.businessContextPlaceholder}
                  rows={3}
                  {...form.register("businessDescription")}
                />
                <FieldError
                  message={form.formState.errors.businessDescription?.message}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#374151] dark:text-slate-200">
                  {flowCopy.productsLabel}
                </label>
                <textarea
                  className={inputClass + " min-h-[96px] resize-y"}
                  placeholder={flowCopy.productsPlaceholder}
                  rows={3}
                  {...form.register("productsServices")}
                />
                <FieldError
                  message={form.formState.errors.productsServices?.message}
                />
              </div>
            </div>
          </SurfaceCard>
        </div>

        <aside className="space-y-6">
          <SurfaceCard className="space-y-5 rounded-[22px] border-[#f1efe8] dark:border-white/10">
            <h4 className="text-base font-bold text-[#161d2f] dark:text-slate-100">
              C. First AI Message
            </h4>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#374151] dark:text-slate-200">
                Prefilled greeting
              </label>
              <textarea
                className={inputClass + " min-h-[108px] resize-y"}
                rows={4}
                {...form.register("firstAiMessage")}
              />
              <p className="text-xs text-[#6b7280] dark:text-slate-300/75">
                Jennifer uses this tone as the opening message when new
                conversations start.
              </p>
            </div>
          </SurfaceCard>

          <SurfaceCard className="space-y-4 rounded-[22px]">
            <h4 className="text-base font-bold text-[#161d2f] dark:text-slate-100">
              Engine Activation
            </h4>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#0f172a]">
              <p className="text-sm font-bold text-[#161d2f] dark:text-slate-100">
                {flowCopy.assistantName}
              </p>
              <p className="mt-2 text-xs leading-5 text-[#6b7280] dark:text-slate-300/75">
                {flowCopy.assistantDescription}
              </p>
            </div>
            <div className="rounded-2xl border border-[rgba(254,144,29,0.16)] bg-[rgba(254,144,29,0.08)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#161d2f] dark:text-slate-100">
                    Activate Jennifer (AI Auto-Reply)
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#6b7280] dark:text-slate-300/75">
                    n8n can read this flag before replying. If turned off,
                    Jennifer stays silent.
                  </p>
                </div>
                <Toggle
                  checked={watchedValues.isAiActive}
                  onClick={() =>
                    form.setValue("isAiActive", !watchedValues.isAiActive, {
                      shouldDirty: true,
                    })
                  }
                />
              </div>
            </div>
            <div className="rounded-2xl border border-[#ece8df] bg-[#fffaf0] p-4 text-sm leading-7 text-[#7b6b55] dark:border-[rgba(254,144,29,0.14)] dark:bg-[rgba(254,144,29,0.08)] dark:text-slate-300/80">
              <div className="flex items-center gap-2 font-semibold text-[#161d2f] dark:text-slate-100">
                <Database className="h-4 w-4 text-[#fe901d]" />
                Saved fields
              </div>
              <p className="mt-2">
                `org.settings`, `org.businessDescription`,
                `org.productsServices`, and `org.firstAiMessage` will power
                Jennifer later on.
              </p>
            </div>
          </SurfaceCard>
        </aside>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 pt-2 md:flex-row">
        <button
          className={ghostButtonClass}
          onClick={() => setCurrentStep(4)}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          className={primaryButtonClass}
          disabled={buttonBusy}
          onClick={handleAiContinue}
          type="button"
        >
          {buttonBusy ? "Initializing..." : flowCopy.initButtonLabel}
          {buttonBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Rocket className="h-4 w-4" />
          )}
        </button>
      </div>
    </SurfaceCard>
  );

  const renderStepSix = (
    <SurfaceCard className="mx-auto max-w-[580px] space-y-8 rounded-[32px] px-8 py-12 text-center">
      <div className="relative mx-auto mb-2 flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#fff1df] text-[#fe901d]">
        <CheckCircle2 className="h-10 w-10" strokeWidth={2.4} />
        <div className="absolute inset-[-8px] animate-ping rounded-full border-2 border-[#fff1df]" />
      </div>

      <div className="space-y-3">
        <h3 className="text-4xl font-black tracking-tight text-[#161d2f] dark:text-slate-50">
          {flowCopy.completionTitle}
        </h3>
        <p className="text-lg leading-relaxed text-[#6b7280] dark:text-slate-300/75">
          {flowCopy.completionDescription}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#0f172a]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a58f72]">
            Leads
          </p>
          <p className="mt-1 font-bold text-[#161d2f] dark:text-slate-100">
            Active
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#0f172a]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a58f72]">
            AI Rep
          </p>
          <p className="mt-1 font-bold text-[#161d2f] dark:text-slate-100">
            Training
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#0f172a]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a58f72]">
            Dashboard
          </p>
          <p className="mt-1 font-bold text-[#161d2f] dark:text-slate-100">
            Unlocked
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 pt-2 md:flex-row">
        <button
          className={ghostButtonClass}
          onClick={() => setCurrentStep(5)}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          className={primaryButtonClass}
          disabled={buttonBusy}
          onClick={handleFinish}
          type="button"
        >
          {buttonBusy ? "Unlocking..." : "Enter Dashboard"}
          {buttonBusy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Rocket className="h-5 w-5" />
          )}
        </button>
      </div>
    </SurfaceCard>
  );

  function renderStepContent() {
    switch (currentStep) {
      case 1:
        return renderStepOne;
      case 2:
        return renderStepTwo;
      case 3:
        return renderStepThree;
      case 4:
        return renderStepFour;
      case 5:
        return renderStepFive;
      case 6:
        return renderStepSix;
      default:
        return renderStepOne;
    }
  }

  return (
    <OnboardingCanvas title={getTopbarTitle(currentStep)} user={user}>
      <div className="mx-auto w-full max-w-[1240px]">
        {isLoading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-[#e5e7eb] bg-white text-sm font-medium text-[#5f5e5e] dark:border-white/10 dark:bg-[#111827] dark:text-slate-300/75">
            Loading your onboarding workspace...
          </div>
        ) : error ? (
          <div className="rounded-[20px] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
            We could not load your onboarding state right now. Refresh and try
            again.
          </div>
        ) : (
          <div className="space-y-8">
            {stepHeader}
            <div className="mx-auto w-full max-w-[980px]">
              {renderStepContent()}
            </div>
          </div>
        )}
      </div>

      {showTrainingOverlay ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-[rgba(255,255,255,0.96)] backdrop-blur dark:bg-[rgba(2,6,23,0.88)]">
          <div className="h-[66px] w-[66px] animate-spin rounded-full border-4 border-[rgba(254,144,29,0.14)] border-t-[#fe901d]" />
          <h2 className="text-2xl font-black text-[#161d2f] dark:text-slate-50">
            {flowCopy.trainingTitle}
          </h2>
        </div>
      ) : null}
    </OnboardingCanvas>
  );
}
