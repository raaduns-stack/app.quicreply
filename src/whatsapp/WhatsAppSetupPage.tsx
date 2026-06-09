import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe2,
  Loader2,
  MessageSquareText,
  Phone,
  Shield,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  beginOfficialApiEmbeddedSignup,
  completeOfficialApiEmbeddedSignupSession,
  completeOfficialApiSetup,
  getWhatsAppWorkspaceState,
  saveOfficialApiEmbeddedSignupAssets,
  useQuery,
} from "wasp/client/operations";
import { Button } from "../client/components/ui/button";
import { Progress } from "../client/components/ui/progress";
import { useToast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";
import UserLayout from "../user/layout/UserLayout";

type StepId = 1 | 2 | 3 | 4 | 5 | 6;

type WhatsAppWorkspaceState = {
  qr: {
    connected: boolean;
  };
  api: {
    status: "none" | "pending" | "approved";
    phoneNumber: string | null;
    embeddedSignup: {
      status:
        | "not_started"
        | "session_prepared"
        | "assets_captured"
        | "linked"
        | "failed";
      sessionId: string | null;
      state: string | null;
      appId: string | null;
      configurationId: string | null;
      businessPortfolioId: string | null;
      wabaId: string | null;
      phoneNumberId: string | null;
      lastError: string | null;
      startedAt: string | null;
      authorizationCodeReceivedAt: string | null;
      completedAt: string | null;
    };
    setupRequest: {
      legalName: string | null;
      registrationNumber: string | null;
      email: string | null;
      phone: string | null;
      businessName: string | null;
      country: string | null;
      website: string | null;
      address: string | null;
      businessManagerId: string | null;
      businessPortfolioId: string | null;
      metaBusinessName: string | null;
      displayName: string | null;
      wabaId: string | null;
      phoneNumberId: string | null;
      apiPhoneNumber: string | null;
      dailyVolume: string | null;
      useCase: string | null;
      templateExample: string | null;
      uploadedDocs: string[];
      metaAuthorizationRequested: boolean;
    } | null;
  };
};

type EmbeddedSignupMessage = {
  type: "WA_EMBEDDED_SIGNUP";
  event:
    | "FINISH"
    | "FINISH_ONLY_WABA"
    | "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
    | "CANCEL"
    | "ERROR";
  data?: {
    business_id?: string;
    waba_id?: string;
    phone_number_id?: string;
    current_step?: string;
  };
  version?: number;
};

declare global {
  interface Window {
    FB?: {
      init: (args: Record<string, unknown>) => void;
      login: (
        callback: (response: {
          authResponse?: { code?: string };
          status?: string;
        }) => void,
        options: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

const steps = [
  {
    id: 1,
    title: "Business Info",
    description: "Legal details for Meta review",
    icon: Building2,
  },
  {
    id: 2,
    title: "Documents",
    description: "Business verification files",
    icon: FileText,
  },
  {
    id: 3,
    title: "Meta Auth",
    description: "Facebook authorization",
    icon: Shield,
  },
  {
    id: 4,
    title: "Business Manager",
    description: "Meta IDs and display name",
    icon: Globe2,
  },
  {
    id: 5,
    title: "WhatsApp Number",
    description: "Phone and messaging plan",
    icon: Phone,
  },
  {
    id: 6,
    title: "Review",
    description: "Submit request",
    icon: CheckCircle2,
  },
] as const;

const inputClass =
  "mt-2 h-11 w-full rounded-lg border border-[#e8e2d8] bg-[#f7f8fa] px-3 text-sm text-[#182235] outline-none transition placeholder:text-slate-400 focus:border-[#fe901d] focus:bg-white focus:ring-2 focus:ring-[#fe901d]/20 dark:border-[#263247] dark:bg-[#0b1324] dark:text-slate-100 dark:placeholder:text-slate-500";

const textareaClass =
  "mt-2 min-h-[96px] w-full resize-none rounded-lg border border-[#e8e2d8] bg-[#f7f8fa] px-3 py-3 text-sm text-[#182235] outline-none transition placeholder:text-slate-400 focus:border-[#fe901d] focus:bg-white focus:ring-2 focus:ring-[#fe901d]/20 dark:border-[#263247] dark:bg-[#0b1324] dark:text-slate-100 dark:placeholder:text-slate-500";

const labelClass =
  "text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300";

const panelClass =
  "rounded-xl border border-[#e8e2d8] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#101826]";

const innerPanelClass =
  "rounded-xl border border-[#e8e2d8] bg-[#f7f8fa] dark:border-white/10 dark:bg-[#0b1324]";

function loadFacebookSdk(appId: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.FB) {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v23.0",
      });
      resolve();
      return;
    }

    window.fbAsyncInit = () => {
      if (!window.FB) {
        reject(new Error("Facebook SDK did not initialize."));
        return;
      }

      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: "v23.0",
      });
      resolve();
    };

    const existingScript = document.getElementById("facebook-jssdk");
    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.onerror = () =>
      reject(new Error("Could not load the Facebook SDK."));
    document.head.appendChild(script);
  });
}

function StatusPill({
  children,
  tone = "amber",
}: {
  children: string;
  tone?: "amber" | "emerald" | "slate";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
      : tone === "slate"
        ? "border-[#e8e2d8] bg-white text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
        : "border-[#ffd694] bg-[#fff7e8] text-[#c96a00] dark:border-[#fe901d]/30 dark:bg-[#fe901d]/10 dark:text-[#ffb45b]";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
        toneClass,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

export default function WhatsAppSetupPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const workspaceQuery = useQuery(getWhatsAppWorkspaceState);
  const workspaceState = workspaceQuery.data as
    | WhatsAppWorkspaceState
    | undefined;
  const isLoading = workspaceQuery.isLoading;
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreparingEmbeddedSignup, setIsPreparingEmbeddedSignup] =
    useState(false);
  const [isLaunchingEmbeddedSignup, setIsLaunchingEmbeddedSignup] =
    useState(false);
  const [isCompletingEmbeddedSignup, setIsCompletingEmbeddedSignup] =
    useState(false);
  const [isFacebookSdkReady, setIsFacebookSdkReady] = useState(false);
  const [isSavingEmbeddedAssets, setIsSavingEmbeddedAssets] = useState(false);
  const [hasHydratedSetupRequest, setHasHydratedSetupRequest] = useState(false);
  const [authorizationRequested, setAuthorizationRequested] = useState(false);
  const [pendingEmbeddedSignupCode, setPendingEmbeddedSignupCode] = useState<
    string | null
  >(null);
  const [pendingEmbeddedSignupAssets, setPendingEmbeddedSignupAssets] =
    useState<{
      businessPortfolioId: string | null;
      businessManagerId: string | null;
      wabaId: string | null;
      phoneNumberId: string | null;
    } | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const embeddedSignupCompletionInFlightRef = useRef(false);
  const [form, setForm] = useState({
    legalName: "",
    registrationNumber: "",
    businessName: "",
    email: user.email ?? "",
    phone: "",
    country: "",
    website: "",
    address: "",
    businessManagerId: "",
    businessPortfolioId: "",
    metaBusinessName: "",
    displayName: "",
    wabaId: "",
    phoneNumberId: "",
    apiPhoneNumber: workspaceState?.api.phoneNumber ?? "",
    dailyVolume: "1,000 - 10,000 messages/day",
    useCase: "Broadcasts, follow-ups, and Jennifer AI replies",
    templateExample:
      "Hi {{name}}, thanks for your interest. Jennifer from our team will help you with the next step.",
  });

  const progressValue = (currentStep / steps.length) * 100;
  const apiStatus = workspaceState?.api.status ?? "none";
  const embeddedSignup = workspaceState?.api.embeddedSignup;
  const savedSetupRequest = workspaceState?.api.setupRequest;

  useEffect(() => {
    if (!savedSetupRequest || hasHydratedSetupRequest) {
      return;
    }

    setForm((current) => ({
      ...current,
      legalName: savedSetupRequest.legalName ?? current.legalName,
      registrationNumber:
        savedSetupRequest.registrationNumber ?? current.registrationNumber,
      businessName: savedSetupRequest.businessName ?? current.businessName,
      email: savedSetupRequest.email ?? current.email,
      phone: savedSetupRequest.phone ?? current.phone,
      country: savedSetupRequest.country ?? current.country,
      website: savedSetupRequest.website ?? current.website,
      address: savedSetupRequest.address ?? current.address,
      businessManagerId:
        savedSetupRequest.businessManagerId ?? current.businessManagerId,
      businessPortfolioId:
        savedSetupRequest.businessPortfolioId ?? current.businessPortfolioId,
      metaBusinessName:
        savedSetupRequest.metaBusinessName ?? current.metaBusinessName,
      displayName: savedSetupRequest.displayName ?? current.displayName,
      wabaId: savedSetupRequest.wabaId ?? current.wabaId,
      phoneNumberId: savedSetupRequest.phoneNumberId ?? current.phoneNumberId,
      apiPhoneNumber:
        savedSetupRequest.apiPhoneNumber ??
        workspaceState?.api.phoneNumber ??
        current.apiPhoneNumber,
      dailyVolume: savedSetupRequest.dailyVolume ?? current.dailyVolume,
      useCase: savedSetupRequest.useCase ?? current.useCase,
      templateExample:
        savedSetupRequest.templateExample ?? current.templateExample,
    }));
    setUploadedDocs(savedSetupRequest.uploadedDocs ?? []);
    setAuthorizationRequested(
      savedSetupRequest.metaAuthorizationRequested ||
        workspaceState?.api.embeddedSignup.status === "session_prepared" ||
        workspaceState?.api.embeddedSignup.status === "assets_captured" ||
        workspaceState?.api.embeddedSignup.status === "linked",
    );
    setHasHydratedSetupRequest(true);
  }, [
    hasHydratedSetupRequest,
    savedSetupRequest,
    workspaceState?.api.phoneNumber,
    workspaceState?.api.embeddedSignup.status,
  ]);

  useEffect(() => {
    if (
      currentStep !== 3 ||
      !embeddedSignup?.appId ||
      !embeddedSignup.configurationId
    ) {
      setIsFacebookSdkReady(false);
      return;
    }

    let cancelled = false;

    void loadFacebookSdk(embeddedSignup.appId)
      .then(() => {
        if (!cancelled) {
          setIsFacebookSdkReady(true);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setIsFacebookSdkReady(false);
          toast({
            variant: "destructive",
            title: "Could not load Meta SDK",
            description: error?.message || "Please refresh and try again.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentStep,
    embeddedSignup?.appId,
    embeddedSignup?.configurationId,
    toast,
  ]);

  useEffect(() => {
    function handleEmbeddedSignupMessage(event: MessageEvent) {
      const isMetaOrigin =
        event.origin === "https://www.facebook.com" ||
        event.origin === "https://web.facebook.com" ||
        event.origin === "https://business.facebook.com";

      if (!isMetaOrigin) {
        return;
      }

      let payload: EmbeddedSignupMessage | null = null;
      if (typeof event.data === "string") {
        try {
          payload = JSON.parse(event.data) as EmbeddedSignupMessage;
        } catch {
          return;
        }
      } else if (event.data && typeof event.data === "object") {
        payload = event.data as EmbeddedSignupMessage;
      }

      if (!payload || payload.type !== "WA_EMBEDDED_SIGNUP") {
        return;
      }

      if (payload.event === "CANCEL") {
        setIsLaunchingEmbeddedSignup(false);
        toast({
          title: "Embedded Signup closed",
          description:
            "Meta closed before finishing. You can launch it again from this step.",
        });
        return;
      }

      if (payload.event === "ERROR") {
        setIsLaunchingEmbeddedSignup(false);
        toast({
          variant: "destructive",
          title: "Embedded Signup failed",
          description:
            payload.data?.current_step ||
            "Meta returned an error before the signup could finish.",
        });
        return;
      }

      if (
        payload.event !== "FINISH" &&
        payload.event !== "FINISH_ONLY_WABA" &&
        payload.event !== "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
      ) {
        return;
      }

      const businessPortfolioId = payload.data?.business_id?.trim() || null;
      const wabaId = payload.data?.waba_id?.trim() || null;
      const phoneNumberId = payload.data?.phone_number_id?.trim() || null;

      setPendingEmbeddedSignupAssets({
        businessPortfolioId,
        businessManagerId: businessPortfolioId,
        wabaId,
        phoneNumberId,
      });

      setForm((current) => ({
        ...current,
        businessManagerId: current.businessManagerId || businessPortfolioId || "",
        businessPortfolioId:
          current.businessPortfolioId || businessPortfolioId || "",
        wabaId: current.wabaId || wabaId || "",
        phoneNumberId: current.phoneNumberId || phoneNumberId || "",
      }));

      toast({
        title: "Meta assets captured",
        description:
          "QuicReply received the WABA and phone number details. If Meta has already returned the authorization code, the workspace will now finish linking.",
      });
    }

    window.addEventListener("message", handleEmbeddedSignupMessage);
    return () => {
      window.removeEventListener("message", handleEmbeddedSignupMessage);
    };
  }, [toast]);

  useEffect(() => {
    const wabaId =
      pendingEmbeddedSignupAssets?.wabaId?.trim() || form.wabaId.trim();
    const phoneNumberId =
      pendingEmbeddedSignupAssets?.phoneNumberId?.trim() ||
      form.phoneNumberId.trim();

    if (
      !pendingEmbeddedSignupCode ||
      !wabaId ||
      !phoneNumberId ||
      embeddedSignupCompletionInFlightRef.current
    ) {
      return;
    }

    embeddedSignupCompletionInFlightRef.current = true;
    setIsCompletingEmbeddedSignup(true);

    void (async () => {
      try {
        await completeOfficialApiEmbeddedSignupSession({
          code: pendingEmbeddedSignupCode,
          businessManagerId:
            pendingEmbeddedSignupAssets?.businessManagerId?.trim() ||
            form.businessManagerId.trim() ||
            undefined,
          businessPortfolioId:
            pendingEmbeddedSignupAssets?.businessPortfolioId?.trim() ||
            form.businessPortfolioId.trim() ||
            undefined,
          metaBusinessName: form.metaBusinessName.trim() || undefined,
          displayName: form.displayName.trim() || undefined,
          wabaId,
          phoneNumberId,
          apiPhoneNumber: form.apiPhoneNumber.trim() || undefined,
        });
        await workspaceQuery.refetch();
        setAuthorizationRequested(true);
        toast({
          title: "Embedded Signup linked",
          description:
            "Meta returned the authorization code and asset IDs. If Meta provisioning succeeds, this workspace can move straight into approved Cloud API mode.",
        });
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Could not finish Embedded Signup",
          description:
            error?.message ||
            "Meta returned data, but QuicReply could not save the linked session.",
        });
      } finally {
        embeddedSignupCompletionInFlightRef.current = false;
        setIsCompletingEmbeddedSignup(false);
        setIsLaunchingEmbeddedSignup(false);
        setPendingEmbeddedSignupCode(null);
      }
    })();
  }, [
    form.apiPhoneNumber,
    form.businessManagerId,
    form.businessPortfolioId,
    form.displayName,
    form.metaBusinessName,
    form.phoneNumberId,
    form.wabaId,
    pendingEmbeddedSignupAssets,
    pendingEmbeddedSignupCode,
    toast,
    workspaceQuery,
  ]);
  const statusMeta = useMemo(() => {
    if (apiStatus === "approved") {
      return { label: "Approved", tone: "emerald" as const };
    }

    if (apiStatus === "pending") {
      return { label: "Pending review", tone: "amber" as const };
    }

    return { label: "Not started", tone: "slate" as const };
  }, [apiStatus]);

  const canProceed = useMemo(() => {
    if (currentStep === 1) {
      return (
        form.legalName.trim() &&
        form.registrationNumber.trim() &&
        form.email.trim() &&
        form.phone.trim()
      );
    }

    if (currentStep === 2) {
      return uploadedDocs.length > 0;
    }

    if (currentStep === 3) {
      return embeddedSignup?.status === "linked";
    }

    if (currentStep === 4) {
      return (
        form.businessManagerId.trim() &&
        form.businessPortfolioId.trim() &&
        form.displayName.trim()
      );
    }

    if (currentStep === 5) {
      return (
        form.apiPhoneNumber.trim() &&
        form.phoneNumberId.trim() &&
        form.useCase.trim()
      );
    }

    return true;
  }, [currentStep, embeddedSignup?.status, form, uploadedDocs.length]);

  function updateForm(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function goNext() {
    if (currentStep === 4) {
      setIsSavingEmbeddedAssets(true);
      try {
        await saveOfficialApiEmbeddedSignupAssets({
          businessManagerId: form.businessManagerId,
          businessPortfolioId: form.businessPortfolioId,
          metaBusinessName: form.metaBusinessName,
          displayName: form.displayName,
          wabaId: form.wabaId,
          phoneNumberId: form.phoneNumberId,
          apiPhoneNumber: form.apiPhoneNumber,
        });
        await workspaceQuery.refetch();
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Could not save Meta asset details",
          description: error?.message || "Please try again.",
        });
        setIsSavingEmbeddedAssets(false);
        return;
      } finally {
        setIsSavingEmbeddedAssets(false);
      }
    }

    if (currentStep < 6 && canProceed) {
      setCurrentStep((currentStep + 1) as StepId);
    }
  }

  function goBack() {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as StepId);
    }
  }

  function handleFileUpload() {
    const nextDocs = [
      "Business_Registration.pdf",
      "Utility_Bill.pdf",
      "Director_ID.pdf",
    ];
    const next = nextDocs[uploadedDocs.length] ?? "Supporting_Document.pdf";
    setUploadedDocs((current) => [...current, next]);
  }

  async function handleMetaAuthorization() {
    setIsPreparingEmbeddedSignup(true);
    try {
      const nextState = (await beginOfficialApiEmbeddedSignup(
        {},
      )) as WhatsAppWorkspaceState;
      await workspaceQuery.refetch();
      const embeddedSignup = nextState.api.embeddedSignup;
      setAuthorizationRequested(
        embeddedSignup.status === "session_prepared" ||
          embeddedSignup.status === "assets_captured" ||
          embeddedSignup.status === "linked",
      );
      toast({
        title:
          embeddedSignup.status === "failed"
            ? "Embedded Signup session prepared with config warning"
            : "Embedded Signup session prepared",
        description:
          embeddedSignup.lastError ||
          "Meta session state was stored for this workspace. Launch the popup next to return the real authorization code and asset IDs.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Could not prepare Embedded Signup",
        description: error?.message || "Please try again.",
      });
    } finally {
      setIsPreparingEmbeddedSignup(false);
    }
  }

  function handleLaunchEmbeddedSignup() {
    if (
      !window.FB ||
      !embeddedSignup?.configurationId ||
      !embeddedSignup.appId
    ) {
      toast({
        variant: "destructive",
        title: "Embedded Signup is not ready",
        description:
          "Prepare the session first and make sure Meta app/config values are available.",
      });
      return;
    }

    setIsLaunchingEmbeddedSignup(true);
    try {
      window.FB.login(
        (response) => {
          const code = response.authResponse?.code?.trim();

          if (!code) {
            setIsLaunchingEmbeddedSignup(false);
            toast({
              variant: "destructive",
              title: "Meta did not return an authorization code",
              description:
                response.status === "unknown"
                  ? "The popup closed or was blocked before the signup finished."
                  : "Please launch Embedded Signup again.",
            });
            return;
          }

          setAuthorizationRequested(true);
          setPendingEmbeddedSignupCode(code);
          toast({
            title: "Authorization code received",
            description:
              "Waiting for the embedded signup asset IDs so QuicReply can finish linking this workspace.",
          });
        },
        {
          config_id: embeddedSignup.configurationId,
          response_type: "code",
          override_default_response_type: true,
          extras: {
            feature: "whatsapp_embedded_signup",
            sessionInfoVersion: 3,
          },
        },
      );
    } catch (error: any) {
      setIsLaunchingEmbeddedSignup(false);
      toast({
        variant: "destructive",
        title: "Could not launch Embedded Signup",
        description: error?.message || "Please try again.",
      });
    }
  }

  async function handleSubmit() {
    setIsSaving(true);

    try {
      await completeOfficialApiSetup({
        ...form,
        businessName: form.businessName || form.legalName,
        uploadedDocs,
        metaAuthorizationRequested: authorizationRequested,
      });
      toast({
        title: "API setup request saved",
        description:
          "The setup details were saved. If Embedded Signup has already provisioned Meta successfully, the API can activate immediately; otherwise it remains pending.",
      });
      navigate("/whatsapp");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Could not save API request",
        description: error?.message || "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <UserLayout user={user}>
      <div className="w-full min-w-0 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button
              asChild
              variant="ghost"
              className="mb-3 h-auto gap-2 px-0 text-slate-500 hover:bg-transparent hover:text-[#fe901d] dark:text-slate-400"
            >
              <Link to="/whatsapp">
                <ArrowLeft className="h-4 w-4" />
                Back to WhatsApp
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">
                Official WhatsApp API Setup
              </h1>
              <StatusPill tone={statusMeta.tone}>{statusMeta.label}</StatusPill>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              The detailed Meta API path for verified, high-volume WhatsApp
              delivery. This submits a pending setup request; it does not fake
              Meta approval.
            </p>
          </div>
          <Button
            className="gap-2"
            disabled={isSaving || currentStep !== 6}
            onClick={handleSubmit}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Submit for Review
          </Button>
        </div>

        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className={panelClass}>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Setup progress
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <h2 className="text-xl font-bold text-[#182235] dark:text-white">
                Step {currentStep} of {steps.length}
              </h2>
              <span className="text-xs font-bold text-[#ffb45b]">
                {Math.round(progressValue)}%
              </span>
            </div>
            <Progress className="mt-3 h-1.5" value={progressValue} />

            <div className="mt-5 space-y-2">
              {steps.map((step) => {
                const Icon = step.icon;
                const active = step.id === currentStep;
                const complete = step.id < currentStep;

                return (
                  <button
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition",
                      active &&
                        "border-[#fe901d]/50 bg-[#fff3e1] text-[#182235] dark:bg-[#fe901d]/10 dark:text-white",
                      complete &&
                        "border-emerald-200 bg-emerald-50 text-[#182235] dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-white",
                      !active &&
                        !complete &&
                        "border-[#e8e2d8] bg-[#f7f8fa] text-slate-600 hover:border-[#fe901d]/30 hover:bg-[#fff8ee] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-300 dark:hover:bg-white/5",
                    )}
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    type="button"
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                        active && "bg-[#fe901d] text-white",
                        complete && "bg-emerald-500 text-white",
                        !active &&
                          !complete &&
                          "bg-white text-slate-500 dark:bg-white/10 dark:text-slate-300",
                      )}
                    >
                      {complete ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-bold">
                        {step.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                        {step.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-xl border border-[#ffd694] bg-[#fff7e8] p-4 dark:border-[#fe901d]/25 dark:bg-[#fe901d]/10">
              <p className="text-sm font-bold text-[#c96a00] dark:text-[#ffb45b]">
                QR remains active
              </p>
              <p className="mt-1 text-xs leading-5 text-[#8a5a13] dark:text-amber-100/80">
                {isLoading
                  ? "Checking QR status..."
                  : workspaceState?.qr.connected
                    ? "QR mode is connected while API setup is reviewed."
                    : "Users can connect QR mode before or during API review."}
              </p>
            </div>
          </aside>

          <section className={cn(panelClass, "md:p-7")}>
            {currentStep === 1 ? (
              <div>
                <StepHeader
                  eyebrow="Step 1 of 6"
                  icon={<Building2 className="h-4 w-4" />}
                  title="Business Information"
                  description="Meta requires legal business details before an Official WhatsApp API setup can be reviewed."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Legal business name *"
                    onChange={(value) => updateForm("legalName", value)}
                    placeholder="ABC Properties Limited"
                    value={form.legalName}
                  />
                  <Field
                    label="Registration number / CAC / RC *"
                    onChange={(value) =>
                      updateForm("registrationNumber", value)
                    }
                    placeholder="RC1234567"
                    value={form.registrationNumber}
                  />
                  <Field
                    label="Business email *"
                    onChange={(value) => updateForm("email", value)}
                    placeholder="info@example.com"
                    type="email"
                    value={form.email}
                  />
                  <Field
                    label="Business phone *"
                    onChange={(value) => updateForm("phone", value)}
                    placeholder="+234 801 234 5678"
                    value={form.phone}
                  />
                  <Field
                    label="Country"
                    onChange={(value) => updateForm("country", value)}
                    placeholder="Nigeria"
                    value={form.country}
                  />
                  <Field
                    label="Website"
                    onChange={(value) => updateForm("website", value)}
                    placeholder="https://example.com"
                    value={form.website}
                  />
                  <div className="md:col-span-2">
                    <Field
                      label="Business address"
                      onChange={(value) => updateForm("address", value)}
                      placeholder="123 Victoria Island, Lagos"
                      value={form.address}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div>
                <StepHeader
                  eyebrow="Step 2 of 6"
                  icon={<FileText className="h-4 w-4" />}
                  title="Verification Documents"
                  description="Add the business verification documents needed for Meta review."
                />
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                  <button
                    className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#e8e2d8] bg-[#f7f8fa] p-8 text-center transition hover:border-[#fe901d]/50 hover:bg-[#fff8ee] dark:border-white/15 dark:bg-[#0b1324] dark:hover:bg-[#fe901d]/5"
                    onClick={handleFileUpload}
                    type="button"
                  >
                    <span className="grid h-14 w-14 place-items-center rounded-xl bg-[#fe901d]/10 text-[#fe901d]">
                      <Upload className="h-7 w-7" />
                    </span>
                    <p className="mt-4 text-sm font-bold text-[#182235] dark:text-white">
                      Add document
                    </p>
                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Include registration, address proof, or identity files
                      needed for the API review.
                    </p>
                  </button>
                  <div className={cn(innerPanelClass, "p-4")}>
                    <p className="text-sm font-bold text-[#182235] dark:text-white">
                      Required by Meta
                    </p>
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                      <li>Business registration / CAC certificate</li>
                      <li>Utility bill or address proof</li>
                      <li>Director ID if requested</li>
                    </ul>
                  </div>
                </div>

                {uploadedDocs.length ? (
                  <div className="mt-5 space-y-2">
                    {uploadedDocs.map((doc) => (
                      <div
                        className={cn(
                          innerPanelClass,
                          "flex items-center gap-3 p-3",
                        )}
                        key={doc}
                      >
                        <FileText className="h-4 w-4 text-[#fe901d]" />
                        <span className="flex-1 text-sm font-semibold text-[#182235] dark:text-white">
                          {doc}
                        </span>
                        <button
                          className="cursor-pointer text-slate-500 hover:text-red-400"
                          onClick={() =>
                            setUploadedDocs((current) =>
                              current.filter((item) => item !== doc),
                            )
                          }
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div>
                <StepHeader
                  eyebrow="Step 3 of 6"
                  icon={<Shield className="h-4 w-4" />}
                  title="Prepare Meta Embedded Signup"
                  description="Prepare the workspace session, launch Meta's popup, and capture the returned Cloud API asset IDs without pretending the API is fully activated."
                />
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-400/20 dark:bg-blue-500/5">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white">
                      <svg
                        aria-hidden="true"
                        className="h-8 w-8"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl font-bold text-[#182235] dark:text-white">
                        Prepare Meta session
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        This action creates a server-side Embedded Signup
                        session record with app/config metadata so the frontend
                        popup can be wired against a real workspace session.
                      </p>
                      <div className="mt-4 grid gap-2 text-xs text-slate-600 dark:text-slate-300 md:grid-cols-3">
                        {[
                          "Business management",
                          "WhatsApp Business Accounts",
                          "Message templates",
                        ].map((item) => (
                          <div
                            className="flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#0b1324]"
                            key={item}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            {item}
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button
                          className="gap-2 bg-blue-600 hover:bg-blue-700"
                          disabled={
                            isPreparingEmbeddedSignup ||
                            isLaunchingEmbeddedSignup ||
                            isCompletingEmbeddedSignup
                          }
                          onClick={() => void handleMetaAuthorization()}
                        >
                          {isPreparingEmbeddedSignup ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : authorizationRequested ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <ExternalLink className="h-4 w-4" />
                          )}
                          {isPreparingEmbeddedSignup
                            ? "Preparing session"
                            : authorizationRequested
                              ? "Re-prepare session"
                              : "Prepare Embedded Signup"}
                        </Button>
                        <Button
                          className="gap-2"
                          disabled={
                            !embeddedSignup?.appId ||
                            !embeddedSignup.configurationId ||
                            !isFacebookSdkReady ||
                            isPreparingEmbeddedSignup ||
                            isLaunchingEmbeddedSignup ||
                            isCompletingEmbeddedSignup
                          }
                          onClick={handleLaunchEmbeddedSignup}
                          variant="outline"
                        >
                          {isLaunchingEmbeddedSignup ||
                          isCompletingEmbeddedSignup ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : embeddedSignup?.status === "linked" ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                          {isCompletingEmbeddedSignup
                            ? "Finishing link"
                            : isLaunchingEmbeddedSignup
                              ? "Waiting for Meta"
                              : embeddedSignup?.status === "linked"
                                ? "Linked to Meta"
                                : "Launch Embedded Signup"}
                        </Button>
                      </div>
                      <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4 text-xs leading-5 text-slate-600 dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-300">
                        <p className="font-semibold text-[#182235] dark:text-white">
                          Current backend session
                        </p>
                        <p className="mt-2">
                          Status:{" "}
                          {workspaceState?.api.embeddedSignup.status ?? "not_started"}
                        </p>
                        <p>
                          App ID:{" "}
                          {workspaceState?.api.embeddedSignup.appId || "Missing"}
                        </p>
                        <p>
                          Config ID:{" "}
                          {workspaceState?.api.embeddedSignup.configurationId ||
                            "Missing"}
                        </p>
                        <p>
                          Session ID:{" "}
                          {workspaceState?.api.embeddedSignup.sessionId || "Not prepared"}
                        </p>
                        <p>
                          SDK ready: {isFacebookSdkReady ? "Yes" : "No"}
                        </p>
                        <p>
                          Authorization code received:{" "}
                          {workspaceState?.api.embeddedSignup
                            .authorizationCodeReceivedAt || "Not yet"}
                        </p>
                        {workspaceState?.api.embeddedSignup.lastError ? (
                          <p className="mt-2 text-red-600 dark:text-red-300">
                            {workspaceState.api.embeddedSignup.lastError}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {currentStep === 4 ? (
              <div>
                <StepHeader
                  eyebrow="Step 4 of 6"
                  icon={<Globe2 className="h-4 w-4" />}
                  title="Meta Business Manager"
                  description="Use manual fields now instead of fake Meta businesses."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Meta Business Manager ID *"
                    onChange={(value) => updateForm("businessManagerId", value)}
                    placeholder="e.g. 123456789"
                    value={form.businessManagerId}
                  />
                  <Field
                    label="Business portfolio ID *"
                    onChange={(value) =>
                      updateForm("businessPortfolioId", value)
                    }
                    placeholder="Embedded Signup portfolio / business ID"
                    value={form.businessPortfolioId}
                  />
                  <Field
                    label="Meta business name"
                    onChange={(value) => updateForm("metaBusinessName", value)}
                    placeholder="Business Manager name"
                    value={form.metaBusinessName}
                  />
                  <Field
                    label="WhatsApp display name *"
                    onChange={(value) => updateForm("displayName", value)}
                    placeholder="Brand name shown in WhatsApp"
                    value={form.displayName}
                  />
                  <Field
                    label="WABA ID"
                    onChange={(value) => updateForm("wabaId", value)}
                    placeholder="Optional WhatsApp Business Account ID"
                    value={form.wabaId}
                  />
                </div>
                <div className="mt-4 rounded-xl border border-[#e8e2d8] bg-[#f7f8fa] p-4 text-xs leading-5 text-slate-600 dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-300">
                  Save the Meta asset identifiers captured from Embedded Signup
                  here. This keeps them on the workspace now, and the same
                  backend action can later be called automatically from the real
                  callback flow.
                </div>
              </div>
            ) : null}

            {currentStep === 5 ? (
              <div>
                <StepHeader
                  eyebrow="Step 5 of 6"
                  icon={<Phone className="h-4 w-4" />}
                  title="WhatsApp Number & Messaging Plan"
                  description="Capture the phone number and expected usage before submission."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="WhatsApp API phone number *"
                    onChange={(value) => updateForm("apiPhoneNumber", value)}
                    placeholder="e.g. 2348012345678"
                    value={form.apiPhoneNumber}
                  />
                  <Field
                    label="Phone number ID *"
                    onChange={(value) => updateForm("phoneNumberId", value)}
                    placeholder="Meta phone_number_id"
                    value={form.phoneNumberId}
                  />
                  <label className="block">
                    <span className={labelClass}>Expected volume</span>
                    <select
                      className={cn(inputClass, "cursor-pointer")}
                      onChange={(event) =>
                        updateForm("dailyVolume", event.target.value)
                      }
                      value={form.dailyVolume}
                    >
                      <option>Under 500 messages/day</option>
                      <option>1,000 - 10,000 messages/day</option>
                      <option>10,000 - 50,000 messages/day</option>
                      <option>50,000+ messages/day</option>
                    </select>
                  </label>
                  <div className="md:col-span-2">
                    <Field
                      label="Main use case *"
                      onChange={(value) => updateForm("useCase", value)}
                      placeholder="Broadcasts, support, follow-ups..."
                      value={form.useCase}
                    />
                  </div>
                  <label className="block md:col-span-2">
                    <span className={labelClass}>Example first message</span>
                    <textarea
                      className={textareaClass}
                      onChange={(event) =>
                        updateForm("templateExample", event.target.value)
                      }
                      value={form.templateExample}
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {currentStep === 6 ? (
              <div>
                <StepHeader
                  eyebrow="Step 6 of 6"
                  icon={<ShieldCheck className="h-4 w-4" />}
                  title="Review & Submit"
                  description="This creates a pending Official API setup request for review."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["Legal business", form.legalName],
                    ["Registration", form.registrationNumber],
                    ["Business email", form.email],
                    ["WhatsApp number", form.apiPhoneNumber],
                    ["Phone number ID", form.phoneNumberId],
                    ["Business Manager ID", form.businessManagerId],
                    ["Business portfolio ID", form.businessPortfolioId],
                    ["Display name", form.displayName],
                    ["Documents", `${uploadedDocs.length} captured`],
                    [
                      "Meta authorization",
                      workspaceState?.api.embeddedSignup.status === "linked"
                        ? "Linked"
                        : workspaceState?.api.embeddedSignup.status ===
                              "session_prepared" ||
                            workspaceState?.api.embeddedSignup.status ===
                              "assets_captured"
                          ? "Prepared, not linked"
                          : "Not prepared",
                    ],
                  ].map(([label, value]) => (
                    <div className={cn(innerPanelClass, "p-4")} key={label}>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500">
                        {label}
                      </p>
                      <p className="mt-2 text-sm font-bold text-[#182235] dark:text-white">
                        {value || "Not provided"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-xl border border-[#ffd694] bg-[#fff7e8] p-4 dark:border-[#fe901d]/25 dark:bg-[#fe901d]/10">
                  <p className="text-sm font-bold text-[#c96a00] dark:text-[#ffb45b]">
                    Production-safe behavior
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#8a5a13] dark:text-amber-100/80">
                    Submitting this request saves the setup details. Embedded
                    Signup can move the workspace into approved Cloud API mode
                    only after Meta linkage and app subscription both succeed.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex items-center justify-between border-t border-[#e8e2d8] pt-5 dark:border-white/10">
              <Button
                className="gap-2"
                disabled={currentStep === 1}
                onClick={goBack}
                variant="outline"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              {currentStep < 6 ? (
                <Button
                  className="gap-2"
                  disabled={!canProceed || isSavingEmbeddedAssets}
                  onClick={() => void goNext()}
                >
                  {isSavingEmbeddedAssets ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Meta assets
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  className="gap-2"
                  disabled={isSaving}
                  onClick={handleSubmit}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Submit for Review
                </Button>
              )}
            </div>
          </section>
        </div>
      </div>
    </UserLayout>
  );
}

function StepHeader({
  eyebrow,
  icon,
  title,
  description,
}: {
  eyebrow: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fe901d]/20 bg-[#fe901d]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ffb45b]">
        {icon}
        {eyebrow}
      </span>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-[#182235] dark:text-white">
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}
