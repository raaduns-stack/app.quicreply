import { type ReactNode, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Globe2,
  Loader2,
  MessageSquareText,
  Phone,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import {
  completeOfficialApiSetup,
  getWhatsAppWorkspaceState,
  useQuery,
} from "wasp/client/operations";
import { Button } from "../client/components/ui/button";
import { useToast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";
import UserLayout from "../user/layout/UserLayout";

type WhatsAppWorkspaceState = {
  whatsappMode: "qr" | "api" | "both";
  qr: {
    connected: boolean;
    status: "disconnected" | "pending" | "connected" | "expired" | "failed";
  };
  api: {
    status: "none" | "pending" | "approved";
    phoneNumber: string | null;
    messagingLimit: string | null;
  };
};

const inputClass =
  "mt-2 h-11 w-full rounded-lg border border-[#263247] bg-[#0b1324] px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#fe901d] focus:ring-2 focus:ring-[#fe901d]/20";

const textareaClass =
  "mt-2 min-h-[104px] w-full resize-none rounded-lg border border-[#263247] bg-[#0b1324] px-3 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-[#fe901d] focus:ring-2 focus:ring-[#fe901d]/20";

const selectClass = cn(inputClass, "cursor-pointer");

function StatusPill({
  children,
  tone = "amber",
}: {
  children: string;
  tone?: "amber" | "emerald" | "slate";
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : tone === "slate"
        ? "border-white/10 bg-white/5 text-slate-300"
        : "border-[#fe901d]/30 bg-[#fe901d]/10 text-[#ffb45b]";

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

function SetupCard({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#101826] p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#fe901d]/10 text-[#fe901d]">
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#c2a878]">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function WhatsAppSetupPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading } = useQuery(getWhatsAppWorkspaceState);
  const workspaceState = data as WhatsAppWorkspaceState | undefined;
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    website: "",
    country: "",
    apiPhoneNumber: workspaceState?.api.phoneNumber ?? "",
    businessManagerId: "",
    dailyVolume: "1,000 - 10,000 messages/day",
    useCase: "Broadcasts, follow-ups, and Jennifer AI replies",
    templateExample:
      "Hi {{name}}, thanks for your interest. Jennifer from our team will help you with the next step.",
  });

  const apiStatus = workspaceState?.api.status ?? "none";
  const statusMeta = useMemo(() => {
    if (apiStatus === "approved") {
      return { label: "Approved", tone: "emerald" as const };
    }

    if (apiStatus === "pending") {
      return { label: "Pending review", tone: "amber" as const };
    }

    return { label: "Not started", tone: "slate" as const };
  }, [apiStatus]);

  function updateForm(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    setIsSaving(true);

    try {
      await completeOfficialApiSetup(form);
      toast({
        title: "API setup request saved",
        description:
          "QR mode can keep running while the Official API setup is reviewed.",
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
              className="mb-3 h-auto gap-2 px-0 text-slate-400 hover:bg-transparent hover:text-[#fe901d]"
            >
              <Link to="/whatsapp">
                <ArrowLeft className="h-4 w-4" />
                Back to WhatsApp
              </Link>
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Official WhatsApp API Setup
              </h1>
              <StatusPill tone={statusMeta.tone}>{statusMeta.label}</StatusPill>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Upgrade from QR mode to verified high-volume WhatsApp delivery. QR
              remains the active fast path while API details are reviewed.
            </p>
          </div>
          <Button className="gap-2" disabled={isSaving} onClick={handleSubmit}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            Submit API Request
          </Button>
        </div>

        <div className="rounded-xl border border-[#fe901d]/25 bg-[#fe901d]/10 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-[#fe901d]/30 bg-[#fe901d]/10 text-[#fe901d]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#ffb45b]">
                QR mode stays active while API setup is reviewed
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-100/80">
                Official API unlocks higher limits, templates, verified business
                identity, and more stable delivery. This page captures the setup
                request; it does not fake Meta approval.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            <SetupCard
              eyebrow="Step 1"
              icon={<Building2 className="h-5 w-5" />}
              title="Business Profile"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    Business name
                  </span>
                  <input
                    className={inputClass}
                    onChange={(event) =>
                      updateForm("businessName", event.target.value)
                    }
                    placeholder="e.g. Revenue Sales OS"
                    value={form.businessName}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    Website
                  </span>
                  <input
                    className={inputClass}
                    onChange={(event) =>
                      updateForm("website", event.target.value)
                    }
                    placeholder="https://example.com"
                    value={form.website}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    Country
                  </span>
                  <select
                    className={selectClass}
                    onChange={(event) =>
                      updateForm("country", event.target.value)
                    }
                    value={form.country}
                  >
                    <option value="">Select country</option>
                    <option value="Nigeria">Nigeria</option>
                    <option value="Ghana">Ghana</option>
                    <option value="Kenya">Kenya</option>
                    <option value="South Africa">South Africa</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    WhatsApp number
                  </span>
                  <input
                    className={inputClass}
                    onChange={(event) =>
                      updateForm("apiPhoneNumber", event.target.value)
                    }
                    placeholder="e.g. 2348012345678"
                    value={form.apiPhoneNumber}
                  />
                </label>
              </div>
            </SetupCard>

            <SetupCard
              eyebrow="Step 2"
              icon={<ClipboardCheck className="h-5 w-5" />}
              title="API Readiness"
            >
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    Meta Business Manager ID
                  </span>
                  <input
                    className={inputClass}
                    onChange={(event) =>
                      updateForm("businessManagerId", event.target.value)
                    }
                    placeholder="Optional, but helpful"
                    value={form.businessManagerId}
                  />
                </label>
                <div className="rounded-lg border border-white/10 bg-[#0b1324] p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    Current QR
                  </p>
                  <p className="mt-2 text-sm font-bold text-white">
                    {isLoading
                      ? "Checking..."
                      : workspaceState?.qr.connected
                        ? "Connected"
                        : "Not connected"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    QR can stay live during API review.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  "Business website is live",
                  "Display name is decided",
                  "WhatsApp number is available",
                  "Message templates may be required",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0b1324] px-3 py-2.5 text-sm font-medium text-slate-200"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </SetupCard>

            <SetupCard
              eyebrow="Step 3"
              icon={<MessageSquareText className="h-5 w-5" />}
              title="Messaging Plan"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    Expected volume
                  </span>
                  <select
                    className={selectClass}
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
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                    Main use case
                  </span>
                  <input
                    className={inputClass}
                    onChange={(event) =>
                      updateForm("useCase", event.target.value)
                    }
                    placeholder="Broadcasts, support, follow-ups..."
                    value={form.useCase}
                  />
                </label>
              </div>
              <label className="mt-4 block">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                  Example first message
                </span>
                <textarea
                  className={textareaClass}
                  onChange={(event) =>
                    updateForm("templateExample", event.target.value)
                  }
                  value={form.templateExample}
                />
              </label>
            </SetupCard>
          </div>

          <aside className="space-y-5">
            <section className="rounded-xl border border-white/10 bg-[#101826] p-5">
              <p className="text-sm font-bold text-white">What happens next</p>
              <div className="mt-4 space-y-4">
                {[
                  "QuicReply reviews the business and phone details.",
                  "Meta requirements and template needs are confirmed.",
                  "QR mode continues while the API path is prepared.",
                  "Once approved, the workspace can switch to Official API mode.",
                ].map((item, index) => (
                  <div key={item} className="flex gap-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#fe901d] text-xs font-bold text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-[#101826] p-5">
              <p className="text-sm font-bold text-white">Scale benefits</p>
              <div className="mt-4 space-y-3">
                {[
                  {
                    icon: <Phone className="h-4 w-4" />,
                    text: "10,000+ messages/day after approval",
                  },
                  {
                    icon: <Globe2 className="h-4 w-4" />,
                    text: "Templates for compliant broadcasts",
                  },
                  {
                    icon: <ShieldCheck className="h-4 w-4" />,
                    text: "Verified business identity path",
                  },
                ].map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0b1324] px-3 py-3 text-sm font-medium text-slate-200"
                  >
                    <span className="text-[#fe901d]">{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </section>

            <Button
              className="w-full gap-2"
              disabled={isSaving}
              onClick={handleSubmit}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Submit API Setup Request
            </Button>
          </aside>
        </div>
      </div>
    </UserLayout>
  );
}
