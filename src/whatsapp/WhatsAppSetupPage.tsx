import { type ReactNode, useEffect, useMemo, useState } from "react";
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
  completeOfficialApiSetup,
  getWhatsAppWorkspaceState,
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
      metaBusinessName: string | null;
      displayName: string | null;
      wabaId: string | null;
      apiPhoneNumber: string | null;
      dailyVolume: string | null;
      useCase: string | null;
      templateExample: string | null;
      uploadedDocs: string[];
      metaAuthorizationRequested: boolean;
    } | null;
  };
};

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
  const { data, isLoading } = useQuery(getWhatsAppWorkspaceState);
  const workspaceState = data as WhatsAppWorkspaceState | undefined;
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [hasHydratedSetupRequest, setHasHydratedSetupRequest] = useState(false);
  const [authorizationRequested, setAuthorizationRequested] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
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
    metaBusinessName: "",
    displayName: "",
    wabaId: "",
    apiPhoneNumber: workspaceState?.api.phoneNumber ?? "",
    dailyVolume: "1,000 - 10,000 messages/day",
    useCase: "Broadcasts, follow-ups, and Jennifer AI replies",
    templateExample:
      "Hi {{name}}, thanks for your interest. Jennifer from our team will help you with the next step.",
  });

  const progressValue = (currentStep / steps.length) * 100;
  const apiStatus = workspaceState?.api.status ?? "none";
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
      metaBusinessName:
        savedSetupRequest.metaBusinessName ?? current.metaBusinessName,
      displayName: savedSetupRequest.displayName ?? current.displayName,
      wabaId: savedSetupRequest.wabaId ?? current.wabaId,
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
    setAuthorizationRequested(savedSetupRequest.metaAuthorizationRequested);
    setHasHydratedSetupRequest(true);
  }, [
    hasHydratedSetupRequest,
    savedSetupRequest,
    workspaceState?.api.phoneNumber,
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
      return authorizationRequested;
    }

    if (currentStep === 4) {
      return form.businessManagerId.trim() && form.displayName.trim();
    }

    if (currentStep === 5) {
      return form.apiPhoneNumber.trim() && form.useCase.trim();
    }

    return true;
  }, [authorizationRequested, currentStep, form, uploadedDocs.length]);

  function updateForm(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function goNext() {
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

  function handleMetaAuthorization() {
    setAuthorizationRequested(true);
    toast({
      title: "Meta authorization noted",
      description:
        "We will wire the live Facebook OAuth connection in the Meta integration step.",
    });
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
          "The Official API request is pending review. QR mode can keep running.",
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
                  title="Connect Meta / Facebook"
                  description="This is the authorization step the client asked for. For now it records intent safely instead of faking live OAuth."
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
                        Continue with Facebook
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Live OAuth is not wired yet. This button keeps the exact
                        setup path visible and records that Meta authorization
                        is needed for this workspace.
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
                      <Button
                        className="mt-5 gap-2 bg-blue-600 hover:bg-blue-700"
                        disabled={authorizationRequested}
                        onClick={handleMetaAuthorization}
                      >
                        {authorizationRequested ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                        {authorizationRequested
                          ? "Authorization request captured"
                          : "Continue with Facebook"}
                      </Button>
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
                    ["Business Manager ID", form.businessManagerId],
                    ["Display name", form.displayName],
                    ["Documents", `${uploadedDocs.length} captured`],
                    [
                      "Meta authorization",
                      authorizationRequested ? "Requested" : "Not requested",
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
                    Submitting this request saves the setup details and marks
                    API status as pending. It does not mark the API as approved
                    or connected.
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
                  disabled={!canProceed}
                  onClick={goNext}
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
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
