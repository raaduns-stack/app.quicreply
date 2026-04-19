import { zodResolver } from "@hookform/resolvers/zod";
import {
  Bot,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageCircleMore,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Button } from "../../client/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../client/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../client/components/ui/form";
import { Input } from "../../client/components/ui/input";
import { Progress } from "../../client/components/ui/progress";
import { Switch } from "../../client/components/ui/switch";
import { Textarea } from "../../client/components/ui/textarea";
import { useToast } from "../../client/hooks/use-toast";
import TextLogoDark from "../../client/static/logos/TextLogo_light.png";
import {
  apiStatusValues,
  onboardingSteps,
  primaryGoalOptions,
  primaryGoalValues,
  trafficSourceOptions,
  trafficSourceValues,
  whatsappModeOptions,
  whatsappModeValues,
} from "./constants";

const onboardingFormSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required."),
  phoneNumber: z.string().trim().min(1, "Phone number is required."),
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
  businessDescription: z.string().trim().min(1, "Business context is required."),
  productsServices: z.string().trim().min(1, "Products or services are required."),
  firstAiMessage: z.string().trim().min(1, "First AI message is required."),
});

type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

const defaultValues: OnboardingFormValues = {
  businessName: "",
  phoneNumber: "",
  industry: "",
  country: "",
  primaryGoal: "generate_leads",
  trafficSources: ["whatsapp"],
  whatsappMode: "qr",
  qrConnected: false,
  apiStatus: "none",
  saveNewChats: true,
  autoTag: true,
  notificationsEnabled: false,
  businessDescription: "",
  productsServices: "",
  firstAiMessage:
    "Hi there! Thanks for reaching out to QuicReply. Tell me what you need and I’ll guide you from here.",
};

const stepFields: Record<number, Array<keyof OnboardingFormValues>> = {
  1: ["businessName", "phoneNumber", "industry", "country"],
  2: ["primaryGoal"],
  3: ["trafficSources"],
  4: ["whatsappMode"],
  5: ["businessDescription", "productsServices", "firstAiMessage"],
  6: [],
};

const leftRailHighlights: Record<number, string[]> = {
  1: [
    "Brand identity locked in",
    "Contact details saved",
    "Industry context captured",
  ],
  2: [
    "Revenue goal focused",
    "Workspace intent defined",
    "Priority outcome set",
  ],
  3: [
    "Traffic sources mapped",
    "Lead channels identified",
    "Inbox routing ready",
  ],
  4: [
    "QR is the default instant path",
    "API stays available for scaling",
    "No sidebar distractions until setup is done",
  ],
  5: [
    "Lead rules switch on from day one",
    "AI learns your offer and tone",
    "First reply is ready before launch",
  ],
  6: [
    "Workspace profile confirmed",
    "WhatsApp route chosen",
    "AI sales rep primed",
  ],
};

function StepBullet({
  index,
  currentStep,
  title,
}: {
  index: number;
  currentStep: number;
  title: string;
}) {
  const isActive = currentStep === index;
  const isComplete = currentStep > index;

  return (
    <div
      className={`rounded-2xl border px-4 py-3 transition ${
        isActive
          ? "border-[#f4bb7a] bg-[rgba(254,144,29,0.09)]"
          : "border-[#ece6de] bg-white/85"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold ${
            isComplete || isActive
              ? "bg-primary text-white"
              : "bg-[#f6f6f6] text-[#8c8c8c]"
          }`}
        >
          {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index}
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9b8f82]">
            Step {index}
          </p>
          <p className="text-sm font-semibold text-[#191c1d]">{title}</p>
        </div>
      </div>
    </div>
  );
}

function SelectionCard({
  active,
  title,
  description,
  eyebrow,
  badge,
  accent = "primary",
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  description: string;
  eyebrow?: string;
  badge?: string;
  accent?: "primary" | "muted";
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition ${
        active
          ? "border-[#f4bb7a] bg-[rgba(254,144,29,0.09)] shadow-[0_18px_36px_-24px_rgba(254,144,29,0.65)]"
          : "border-[#ece6de] bg-white hover:border-[#f4d1a7]"
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#a98a66]">
              {eyebrow}
            </p>
          ) : null}
          <h3 className="mt-1 text-base font-extrabold tracking-[-0.02em] text-[#191c1d]">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#5f5e5e]">{description}</p>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] ${
            active || accent === "primary"
              ? "bg-[rgba(254,144,29,0.14)] text-primary"
              : "bg-[#f3f4f6] text-[#7c7c7c]"
          }`}
        >
          {badge}
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </button>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[#efe6dc] bg-[#fffdf9] px-4 py-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#a98a66]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-6 text-[#191c1d]">{value}</p>
    </div>
  );
}

export default function OnboardingPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery(getOnboardingState);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSavingStep, setIsSavingStep] = useState(false);
  const isOnboardingCompleted =
    (user as AuthUser & { onboardingCompleted?: boolean }).onboardingCompleted ===
    true;

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues,
    mode: "onTouched",
  });

  const watchedValues = form.watch();
  const currentStepMeta = onboardingSteps[currentStep - 1];
  const totalSteps = onboardingSteps.length;
  const progressValue = (currentStep / totalSteps) * 100;

  useEffect(() => {
    if (isOnboardingCompleted || data?.onboardingCompleted) {
      navigate(routes.UserPageRoute.to, { replace: true });
    }
  }, [data?.onboardingCompleted, isOnboardingCompleted, navigate]);

  useEffect(() => {
    if (!data) {
      return;
    }

    setCurrentStep(Math.min(Math.max(data.onboardingStep || 1, 1), 6));

    if (!data.organization) {
      return;
    }

    form.reset({
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
        ) as OnboardingFormValues["trafficSources"]) ||
        defaultValues.trafficSources,
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
    });
  }, [data, form]);

  const summaryValues = useMemo(
    () => ({
      trafficSources:
        watchedValues.trafficSources
          .map(
            (source) =>
              trafficSourceOptions.find((option) => option.value === source)?.label ||
              source,
          )
          .join(", ") || "None selected",
      primaryGoal:
        primaryGoalOptions.find(
          (option) => option.value === watchedValues.primaryGoal,
        )?.label || "Not selected",
      whatsappMode:
        whatsappModeOptions.find(
          (option) => option.value === watchedValues.whatsappMode,
        )?.label || "Not selected",
      leadRules: [
        watchedValues.saveNewChats ? "Save new chats" : null,
        watchedValues.autoTag ? "Auto-tag leads" : null,
        watchedValues.notificationsEnabled ? "Notifications on" : "Notifications off",
      ]
        .filter(Boolean)
        .join(", "),
    }),
    [watchedValues],
  );

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

  async function handleNext() {
    const fields = stepFields[currentStep];
    const isValid = await form.trigger(fields, { shouldFocus: true });
    if (!isValid) {
      return;
    }

    const nextStep = Math.min(currentStep + 1, 6);
    const saved = await persistStep(nextStep, false);
    if (saved) {
      setCurrentStep(nextStep);
    }
  }

  async function handleComplete() {
    const fieldsToValidate = [
      ...stepFields[1],
      ...stepFields[2],
      ...stepFields[3],
      ...stepFields[4],
      ...stepFields[5],
    ];
    const isValid = await form.trigger(fieldsToValidate, { shouldFocus: true });
    if (!isValid) {
      return;
    }

    const saved = await persistStep(6, true);
    if (!saved) {
      return;
    }

    toast({
      title: "Onboarding complete",
      description: "Your workspace is ready. Unlocking the dashboard now.",
    });
    window.location.assign(routes.UserPageRoute.to);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fcfcfc] text-[#191c1d]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(254,144,29,0.14)_0%,transparent_70%)] blur-[100px]" />
        <div className="absolute bottom-[-18%] right-[-5%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(254,144,29,0.10)_0%,transparent_72%)] blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <div className="flex items-center justify-between">
          <a href="https://www.quicreply.io/" className="inline-flex cursor-pointer">
            <img src={TextLogoDark} alt="QuicReply" className="h-8 w-auto" />
          </a>
          <div className="rounded-full border border-[rgba(254,144,29,0.18)] bg-[rgba(254,144,29,0.08)] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-primary">
            {currentStepMeta.badge}
          </div>
        </div>

        <div className="grid flex-1 gap-8 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white/80 px-4 py-2 text-sm font-semibold text-[#5f5e5e] shadow-sm backdrop-blur">
              <Building2 className="h-4 w-4 text-primary" strokeWidth={2.2} />
              Revenue Sales OS setup
            </div>
            <h1 className="max-w-xl text-4xl font-black tracking-[-0.05em] text-[#191c1d] sm:text-5xl">
              {currentStepMeta.headline}
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#5f5e5e]">
              {currentStepMeta.description}
            </p>

            <div className="mt-8 grid gap-3">
              {onboardingSteps.map((step) => (
                <StepBullet
                  key={step.step}
                  currentStep={currentStep}
                  index={step.step}
                  title={step.title}
                />
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {leftRailHighlights[currentStep].map((item) => (
                <Card
                  key={item}
                  className="border-[#f4d1a7] bg-white/80 shadow-[0_16px_40px_-20px_rgba(254,144,29,0.25)]"
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(254,144,29,0.12)] text-primary">
                      <CheckCircle2 className="h-5 w-5" strokeWidth={2.4} />
                    </div>
                    <p className="text-sm font-semibold text-[#191c1d]">{item}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="border-[#f1e2cf] bg-white/95 shadow-[0_24px_80px_-30px_rgba(0,0,0,0.18)]">
            <CardHeader className="space-y-3 border-b border-[#f3f4f6]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-black tracking-[-0.04em]">
                    {currentStepMeta.title}
                  </CardTitle>
                  <CardDescription className="mt-2 text-[15px] leading-6 text-[#5f5e5e]">
                    Complete this step to move the workspace closer to launch.
                  </CardDescription>
                </div>
                <div className="min-w-[118px]">
                  <Progress className="h-2 bg-[#f6ede3]" value={progressValue} />
                  <p className="mt-2 text-right text-xs font-semibold uppercase tracking-[0.14em] text-[#a98a66]">
                    {Math.round(progressValue)}% ready
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex min-h-[420px] items-center justify-center text-sm font-medium text-[#5f5e5e]">
                  Loading your onboarding workspace...
                </div>
              ) : error ? (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-4 text-sm font-medium text-destructive">
                  We could not load your onboarding state right now. Refresh and try again.
                </div>
              ) : (
                <Form {...form}>
                  <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
                    {currentStep === 1 ? (
                      <div className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="businessName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Business Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="QuicReply" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                                    <Input
                                      className="pl-10"
                                      placeholder="+1 555 123 4567"
                                      type="tel"
                                      {...field}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="industry"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Industry</FormLabel>
                                <FormControl>
                                  <Input placeholder="Coaching, retail, SaaS..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Country</FormLabel>
                                <FormControl>
                                  <Input placeholder="United States" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ) : null}

                    {currentStep === 2 ? (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          {primaryGoalOptions.map((option) => {
                            const selected = watchedValues.primaryGoal === option.value;
                            return (
                              <button
                                key={option.value}
                                className={`w-full cursor-pointer rounded-2xl border px-4 py-4 text-left transition ${
                                  selected
                                    ? "border-[#f4bb7a] bg-[rgba(254,144,29,0.09)]"
                                    : "border-[#ece6de] bg-white hover:border-[#f4d1a7]"
                                }`}
                                onClick={() =>
                                  form.setValue("primaryGoal", option.value, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  })
                                }
                                type="button"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <h3 className="text-base font-extrabold tracking-[-0.02em] text-[#191c1d]">
                                      {option.label}
                                    </h3>
                                    <p className="mt-1 text-sm text-[#5f5e5e]">
                                      {option.description}
                                    </p>
                                  </div>
                                  <div
                                    className={`mt-1 h-4 w-4 rounded-full border ${
                                      selected
                                        ? "border-primary bg-primary"
                                        : "border-[#d1d5db] bg-white"
                                    }`}
                                  />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <FormMessage>{form.formState.errors.primaryGoal?.message}</FormMessage>
                      </div>
                    ) : null}

                    {currentStep === 3 ? (
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {trafficSourceOptions.map((option) => {
                            const isChecked = watchedValues.trafficSources.includes(option.value);
                            const toggleTrafficSource = () => {
                              const currentSources = form.getValues("trafficSources");
                              const nextSources = currentSources.includes(option.value)
                                ? currentSources.filter((value) => value !== option.value)
                                : [...currentSources, option.value];
                              form.setValue("trafficSources", nextSources, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            };
                            return (
                              <div
                                key={option.value}
                                aria-pressed={isChecked}
                                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                                  isChecked
                                    ? "border-[#f4bb7a] bg-[rgba(254,144,29,0.09)]"
                                    : "border-[#ece6de] bg-white hover:border-[#f4d1a7]"
                                }`}
                                onClick={toggleTrafficSource}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    toggleTrafficSource();
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                              >
                                <div
                                  aria-hidden="true"
                                  className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
                                    isChecked
                                      ? "border-primary bg-primary text-white"
                                      : "border-[#d1d5db] bg-white text-transparent"
                                  }`}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={3} />
                                </div>
                                <span className="text-sm font-semibold text-[#191c1d]">
                                  {option.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage>{form.formState.errors.trafficSources?.message}</FormMessage>
                      </div>
                    ) : null}

                    {currentStep === 4 ? (
                      <div className="space-y-6">
                        <section className="space-y-4">
                          <div>
                            <h2 className="text-base font-extrabold tracking-[-0.02em] text-[#191c1d]">
                              Choose your connection mode
                            </h2>
                            <p className="mt-1 text-sm text-[#5f5e5e]">
                              QR stays highlighted as the default fast path. Official API is here when scale demands it.
                            </p>
                          </div>

                          <div className="space-y-4">
                            {whatsappModeOptions.map((option) => {
                              const selected = watchedValues.whatsappMode === option.value;
                              return (
                                <SelectionCard
                                  key={option.value}
                                  active={selected}
                                  badge={option.badge}
                                  description={option.description}
                                  eyebrow={option.eyebrow}
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
                                  }}
                                  title={option.label}
                                >
                                  <div className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#7a6e62]">
                                    CTA: {option.cta}
                                  </div>
                                </SelectionCard>
                              );
                            })}
                          </div>
                        </section>

                        {watchedValues.whatsappMode === "qr" ? (
                          <Card className="border-[#efe6dc] bg-[#fffdf9]">
                            <CardContent className="flex items-start justify-between gap-4 p-5">
                              <div>
                                <div className="flex items-center gap-2">
                                  <MessageCircleMore className="h-4 w-4 text-primary" />
                                  <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#a98a66]">
                                    QR Mode
                                  </p>
                                </div>
                                <h3 className="mt-2 text-base font-extrabold text-[#191c1d]">
                                  Keep instant connect as your day-one engine
                                </h3>
                                <p className="mt-2 text-sm leading-6 text-[#5f5e5e]">
                                  You can leave QR disconnected for now and finish the rest of onboarding first.
                                </p>
                              </div>
                              <FormField
                                control={form.control}
                                name="qrConnected"
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-3">
                                    <FormLabel className="m-0 text-sm font-semibold text-[#191c1d]">
                                      QR connected
                                    </FormLabel>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </CardContent>
                          </Card>
                        ) : (
                          <Card className="border-[#efe6dc] bg-[#fffdf9]">
                            <CardContent className="p-5">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#a98a66]">
                                  API Status
                                </p>
                              </div>
                              <h3 className="mt-2 text-base font-extrabold text-[#191c1d]">
                                Official API setup will start as pending
                              </h3>
                              <p className="mt-2 text-sm leading-6 text-[#5f5e5e]">
                                We’ll keep this workspace in pending API setup until business verification and KYC are complete.
                              </p>
                              <div className="mt-4 inline-flex rounded-full border border-[#f4d1a7] bg-[rgba(254,144,29,0.08)] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
                                Pending approval
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ) : null}

                    {currentStep === 5 ? (
                      <div className="space-y-8">
                        <section className="space-y-4">
                          <div>
                            <h2 className="text-base font-extrabold tracking-[-0.02em] text-[#191c1d]">
                              A. Lead Capture Rules
                            </h2>
                            <p className="mt-1 text-sm text-[#5f5e5e]">
                              Define how new conversations should be handled from the start.
                            </p>
                          </div>

                          <div className="space-y-3">
                            <FormField
                              control={form.control}
                              name="saveNewChats"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-2xl border border-[#ece6de] bg-white px-4 py-4">
                                  <div>
                                    <FormLabel className="cursor-pointer text-sm font-semibold text-[#191c1d]">
                                      Save new chats
                                    </FormLabel>
                                    <p className="mt-1 text-sm text-[#5f5e5e]">
                                      Automatically capture every incoming lead conversation.
                                    </p>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="autoTag"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-2xl border border-[#ece6de] bg-white px-4 py-4">
                                  <div>
                                    <FormLabel className="cursor-pointer text-sm font-semibold text-[#191c1d]">
                                      Auto-tag leads
                                    </FormLabel>
                                    <p className="mt-1 text-sm text-[#5f5e5e]">
                                      Help the inbox stay organized with quick lead categorization.
                                    </p>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="notificationsEnabled"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-2xl border border-[#ece6de] bg-white px-4 py-4">
                                  <div>
                                    <FormLabel className="cursor-pointer text-sm font-semibold text-[#191c1d]">
                                      Notifications
                                    </FormLabel>
                                    <p className="mt-1 text-sm text-[#5f5e5e]">
                                      Optional alerts for new hot leads and important conversations.
                                    </p>
                                  </div>
                                  <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </section>

                        <section className="space-y-4">
                          <div>
                            <h2 className="text-base font-extrabold tracking-[-0.02em] text-[#191c1d]">
                              B. AI Setup
                            </h2>
                            <p className="mt-1 text-sm text-[#5f5e5e]">
                              Give the AI enough business context to respond like your team would.
                            </p>
                          </div>

                          <FormField
                            control={form.control}
                            name="businessDescription"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>What do you sell?</FormLabel>
                                <FormControl>
                                  <Textarea
                                    className="min-h-[110px]"
                                    placeholder="Explain the offer, audience, and sales outcome you want."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="productsServices"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Products or services</FormLabel>
                                <FormControl>
                                  <Textarea
                                    className="min-h-[100px]"
                                    placeholder="List the main products, services, packages, or pricing anchors."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </section>

                        <section className="space-y-4">
                          <div>
                            <h2 className="text-base font-extrabold tracking-[-0.02em] text-[#191c1d]">
                              C. First AI Message
                            </h2>
                            <p className="mt-1 text-sm text-[#5f5e5e]">
                              This becomes the starting reply your leads feel first.
                            </p>
                          </div>

                          <FormField
                            control={form.control}
                            name="firstAiMessage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Greeting</FormLabel>
                                <FormControl>
                                  <Textarea
                                    className="min-h-[120px]"
                                    placeholder="Hi there! Thanks for reaching out..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="rounded-2xl border border-[#efe6dc] bg-[#fffdf9] px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 text-primary" />
                              <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[#a98a66]">
                                AI Training
                              </p>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-[#5f5e5e]">
                              The next milestone can trigger OpenClaw embeddings and show the live “Training your AI Sales Rep...” state. For now, we’re capturing the exact setup data this step needs.
                            </p>
                          </div>
                        </section>
                      </div>
                    ) : null}

                    {currentStep === 6 ? (
                      <div className="space-y-6">
                        <div className="rounded-3xl border border-[#f4d1a7] bg-[linear-gradient(180deg,rgba(254,144,29,0.12),rgba(254,144,29,0.03))] p-5">
                          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#a98a66]">
                            Completion
                          </p>
                          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#191c1d]">
                            Your Revenue Engine is primed
                          </h2>
                          <p className="mt-3 text-sm leading-6 text-[#5f5e5e]">
                            Everything below is the setup we’ll use to unlock the dashboard and hand the workspace over to you.
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <SummaryRow label="Business" value={watchedValues.businessName || "Not set"} />
                          <SummaryRow label="Phone" value={watchedValues.phoneNumber || "Not set"} />
                          <SummaryRow label="Industry" value={watchedValues.industry || "Not set"} />
                          <SummaryRow label="Country" value={watchedValues.country || "Not set"} />
                          <SummaryRow label="Primary Goal" value={summaryValues.primaryGoal} />
                          <SummaryRow label="Traffic Sources" value={summaryValues.trafficSources} />
                          <SummaryRow label="WhatsApp Mode" value={summaryValues.whatsappMode} />
                          <SummaryRow label="Lead Rules" value={summaryValues.leadRules} />
                        </div>

                        <Card className="border-[#efe6dc] bg-[#fffdf9]">
                          <CardContent className="space-y-4 p-5">
                            <SummaryRow
                              label="Business Context"
                              value={watchedValues.businessDescription || "Not set"}
                            />
                            <SummaryRow
                              label="Products or Services"
                              value={watchedValues.productsServices || "Not set"}
                            />
                            <SummaryRow
                              label="First AI Message"
                              value={watchedValues.firstAiMessage || "Not set"}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 border-t border-[#f3f4f6] pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-[#5f5e5e]">
                        {currentStep < 6
                          ? `Next up: ${onboardingSteps[currentStep].title}`
                          : "Finish onboarding to unlock the dashboard and sidebar."}
                      </div>
                      <div className="flex items-center gap-3">
                        {currentStep > 1 ? (
                          <Button
                            className="cursor-pointer"
                            onClick={() => setCurrentStep((step) => Math.max(step - 1, 1))}
                            type="button"
                            variant="outline"
                          >
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Back
                          </Button>
                        ) : null}
                        {currentStep < 6 ? (
                          <Button
                            className="cursor-pointer"
                            disabled={isSavingStep}
                            onClick={handleNext}
                            type="button"
                          >
                            {isSavingStep ? "Saving..." : `Complete Step ${currentStep}`}
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            className="cursor-pointer"
                            disabled={isSavingStep}
                            onClick={handleComplete}
                            type="button"
                          >
                            {isSavingStep ? "Unlocking..." : "Unlock Dashboard"}
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
