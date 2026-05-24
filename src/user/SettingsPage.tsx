import { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { getWorkspaceSettings, updateWorkspaceSettings, useQuery } from "wasp/client/operations";
import {
  Bot,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Smartphone,
  UserRound,
  Zap,
} from "lucide-react";
import UserLayout from "./layout/UserLayout";
import { Button } from "../client/components/ui/button";
import { useToast } from "../client/hooks/use-toast";

type SettingsTab = "profile" | "billing" | "integrations";

type SettingsForm = {
  firstName: string;
  lastName: string;
  organizationName: string;
  phoneNumber: string;
  industry: string;
  country: string;
  currency: "NGN" | "USD" | "EUR" | "GBP" | "INR" | "CAD" | "AUD";
  timezone:
    | "Africa/Lagos"
    | "UTC"
    | "Asia/Kolkata"
    | "America/New_York"
    | "America/Los_Angeles"
    | "Europe/London";
  saveNewChats: boolean;
  autoTag: boolean;
  notificationsEnabled: boolean;
  autoConfigureSystem: boolean;
  isAiActive: boolean;
  responseStyle: "professional" | "friendly" | "formal";
  aiLanguage: "english" | "yoruba" | "spanish";
  businessDescription: string;
  productsServices: string;
  firstAiMessage: string;
};

const emptyForm: SettingsForm = {
  firstName: "",
  lastName: "",
  organizationName: "",
  phoneNumber: "",
  industry: "",
  country: "",
  currency: "NGN",
  timezone: "Africa/Lagos",
  saveNewChats: true,
  autoTag: true,
  notificationsEnabled: true,
  autoConfigureSystem: true,
  isAiActive: true,
  responseStyle: "professional",
  aiLanguage: "english",
  businessDescription: "",
  productsServices: "",
  firstAiMessage: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#fe901d] focus:ring-2 focus:ring-[#fe901d]/20 dark:border-white/10 dark:bg-[#111827] dark:text-white dark:placeholder-slate-600";
const labelClass =
  "mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400";
const cardClass =
  "rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0d1524]";

function toForm(data: any): SettingsForm {
  return {
    firstName: data?.staff?.firstName ?? "",
    lastName: data?.staff?.lastName ?? "",
    organizationName: data?.organization?.name ?? "",
    phoneNumber: data?.organization?.phoneNumber ?? "",
    industry: data?.organization?.industry ?? "",
    country: data?.organization?.country ?? "",
    currency: data?.preferences?.currency ?? "NGN",
    timezone: data?.preferences?.timezone ?? "Africa/Lagos",
    saveNewChats: data?.preferences?.saveNewChats ?? true,
    autoTag: data?.preferences?.autoTag ?? true,
    notificationsEnabled: data?.preferences?.notificationsEnabled ?? true,
    autoConfigureSystem: data?.preferences?.autoConfigureSystem ?? true,
    isAiActive: data?.organization?.isAiActive ?? true,
    responseStyle: data?.preferences?.responseStyle ?? "professional",
    aiLanguage: data?.preferences?.aiLanguage ?? "english",
    businessDescription: data?.organization?.businessDescription ?? "",
    productsServices: data?.organization?.productsServices ?? "",
    firstAiMessage: data?.organization?.firstAiMessage ?? "",
  };
}

function SectionTitle(props: {
  icon: React.ComponentType<{ className?: string }>;
  step: string;
  title: string;
  description: string;
}) {
  const Icon = props.icon;

  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff3e1] text-[#fe901d] dark:bg-[#fe901d]/15">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c96a00] dark:text-[#ffb84d]">
          {props.step}
        </p>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {props.title}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {props.description}
        </p>
      </div>
    </div>
  );
}

function ToggleRow(props: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3 dark:border-white/10">
      <span>
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">
          {props.label}
        </span>
        <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
          {props.description}
        </span>
      </span>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
        className="h-5 w-5 cursor-pointer rounded border-slate-300 accent-[#fe901d]"
      />
    </label>
  );
}

const SettingsPage = ({ user }: { user: AuthUser }) => {
  const { toast } = useToast();
  const settingsQuery = useQuery(getWorkspaceSettings);
  const settings = settingsQuery.data as any;
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [initialForm, setInitialForm] = useState<SettingsForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!settings) return;
    const next = toForm(settings);
    setForm(next);
    setInitialForm(next);
  }, [settings]);

  const hasChanges = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm],
  );

  function updateField<K extends keyof SettingsForm>(
    key: K,
    value: SettingsForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings() {
    if (!form.organizationName.trim()) {
      setFormError("Business name is required.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const updated = await updateWorkspaceSettings({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        organizationName: form.organizationName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        industry: form.industry.trim(),
        country: form.country.trim(),
      });
      const next = toForm(updated);
      setForm(next);
      setInitialForm(next);
      await settingsQuery.refetch?.();
      toast({
        title: "Settings saved",
        description: "Business profile, staff name, and preferences are updated.",
      });
    } catch (error: any) {
      setFormError(error?.message || "Could not save settings.");
    } finally {
      setIsSaving(false);
    }
  }

  function resetSettings() {
    setForm(initialForm);
    setFormError("");
  }

  const staffDisplayName = settings?.staff?.displayName ?? "Team Member";
  const staffEmail = settings?.staff?.email ?? user.email ?? "";
  const role = settings?.staff?.role ?? (user.isAdmin ? "Workspace Admin" : "Team Member");
  const qrConnected = Boolean(settings?.organization?.qrConnected);
  const apiStatus = settings?.organization?.apiStatus ?? "none";
  const isLoading = settingsQuery.isLoading && !settings;

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">
              Settings
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage the real business profile, staff name, and workspace preferences.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={resetSettings}
              disabled={!hasChanges || isSaving || isLoading}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={saveSettings}
              disabled={!hasChanges || isSaving || isLoading}
              className="gap-2 bg-[#fe901d] text-white hover:bg-[#e67e0d]"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </div>

        <div className="flex gap-6 border-b border-slate-200 dark:border-white/10">
          {[
            { id: "profile", label: "Profile" },
            { id: "billing", label: "Billing" },
            { id: "integrations", label: "Integrations" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`cursor-pointer pb-4 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-[#fe901d] text-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className={cardClass}>
            <div className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-[#fe901d]" />
              Loading workspace settings...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-5">
              {formError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-300">
                  {formError}
                </div>
              )}

              {activeTab === "profile" && (
                <>
                  <div className={cardClass}>
                    <SectionTitle
                      icon={UserRound}
                      step="Staff"
                      title="Logged-in Staff"
                      description="This name appears in the header, profile menu, and dashboard greeting."
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>First Name</label>
                        <input
                          className={inputClass}
                          value={form.firstName}
                          onChange={(event) => updateField("firstName", event.target.value)}
                          placeholder="e.g. John"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Last Name</label>
                        <input
                          className={inputClass}
                          value={form.lastName}
                          onChange={(event) => updateField("lastName", event.target.value)}
                          placeholder="e.g. Doe"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={cardClass}>
                    <SectionTitle
                      icon={Building2}
                      step="Business"
                      title="Business Profile"
                      description="This controls the company name and business context used across the app."
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Business Name</label>
                        <input
                          className={inputClass}
                          value={form.organizationName}
                          onChange={(event) => updateField("organizationName", event.target.value)}
                          placeholder="e.g. QuicReply Sales Desk"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Phone Number</label>
                        <input
                          className={inputClass}
                          value={form.phoneNumber}
                          onChange={(event) => updateField("phoneNumber", event.target.value)}
                          placeholder="+234 801 234 5678"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Industry / Niche</label>
                        <select
                          className={inputClass}
                          value={form.industry}
                          onChange={(event) => updateField("industry", event.target.value)}
                        >
                          <option value="">Select industry</option>
                          <option value="Gadget Vendor">Gadget Vendor</option>
                          <option value="Hair & Wigs">Hair & Wigs</option>
                          <option value="Fashion/Apparel">Fashion/Apparel</option>
                          <option value="Consumer Tech">Consumer Tech</option>
                          <option value="Food & Beverage">Food & Beverage</option>
                          <option value="Real Estate">Real Estate</option>
                          <option value="Healthcare">Healthcare</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Country</label>
                        <select
                          className={inputClass}
                          value={form.country}
                          onChange={(event) => updateField("country", event.target.value)}
                        >
                          <option value="">Select country</option>
                          <option value="NG">Nigeria</option>
                          <option value="US">United States</option>
                          <option value="IN">India</option>
                          <option value="GB">United Kingdom</option>
                          <option value="CA">Canada</option>
                          <option value="AU">Australia</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <ToggleRow
                        label="Auto-configure system"
                        description="Use the business profile to pre-fill sensible workspace defaults."
                        checked={form.autoConfigureSystem}
                        onChange={(checked) => updateField("autoConfigureSystem", checked)}
                      />
                    </div>
                  </div>

                  <div className={cardClass}>
                    <SectionTitle
                      icon={Settings2}
                      step="Preferences"
                      title="Localization"
                      description="Currency drives dashboard money values. Timezone is stored for scheduling."
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Currency</label>
                        <select
                          className={inputClass}
                          value={form.currency}
                          onChange={(event) =>
                            updateField("currency", event.target.value as SettingsForm["currency"])
                          }
                        >
                          <option value="NGN">₦ Naira NGN</option>
                          <option value="USD">$ USD</option>
                          <option value="EUR">€ EUR</option>
                          <option value="GBP">£ GBP</option>
                          <option value="INR">₹ INR</option>
                          <option value="CAD">CA$ CAD</option>
                          <option value="AUD">A$ AUD</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Timezone</label>
                        <select
                          className={inputClass}
                          value={form.timezone}
                          onChange={(event) =>
                            updateField("timezone", event.target.value as SettingsForm["timezone"])
                          }
                        >
                          <option value="Africa/Lagos">Africa/Lagos GMT+1</option>
                          <option value="UTC">UTC</option>
                          <option value="Asia/Kolkata">Asia/Kolkata GMT+5:30</option>
                          <option value="America/New_York">America/New_York</option>
                          <option value="America/Los_Angeles">America/Los_Angeles</option>
                          <option value="Europe/London">Europe/London</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className={cardClass}>
                    <SectionTitle
                      icon={Bot}
                      step="Jennifer"
                      title="AI Configuration"
                      description="These settings are saved for the AI reply flow and dashboard status."
                    />
                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <ToggleRow
                        label="Activate Jennifer"
                        description="Allow auto-replies."
                        checked={form.isAiActive}
                        onChange={(checked) => updateField("isAiActive", checked)}
                      />
                      <ToggleRow
                        label="Save new chats"
                        description="Capture inbound chats."
                        checked={form.saveNewChats}
                        onChange={(checked) => updateField("saveNewChats", checked)}
                      />
                      <ToggleRow
                        label="Auto-tag leads"
                        description="Tag contacts by activity."
                        checked={form.autoTag}
                        onChange={(checked) => updateField("autoTag", checked)}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Response Style</label>
                        <select
                          className={inputClass}
                          value={form.responseStyle}
                          onChange={(event) =>
                            updateField(
                              "responseStyle",
                              event.target.value as SettingsForm["responseStyle"],
                            )
                          }
                        >
                          <option value="professional">Professional</option>
                          <option value="friendly">Friendly</option>
                          <option value="formal">Formal</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>AI Language</label>
                        <select
                          className={inputClass}
                          value={form.aiLanguage}
                          onChange={(event) =>
                            updateField("aiLanguage", event.target.value as SettingsForm["aiLanguage"])
                          }
                        >
                          <option value="english">English</option>
                          <option value="yoruba">Yoruba</option>
                          <option value="spanish">Spanish</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Business Description</label>
                        <textarea
                          className={`${inputClass} min-h-24 resize-y`}
                          value={form.businessDescription}
                          onChange={(event) => updateField("businessDescription", event.target.value)}
                          placeholder="What does the business sell, who are the customers, and what tone should Jennifer use?"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Describe your Business and Services in Details</label>
                        <textarea
                          className={`${inputClass} min-h-24 resize-y`}
                          value={form.productsServices}
                          onChange={(event) => updateField("productsServices", event.target.value)}
                          placeholder="List core products, services, pricing notes, delivery rules, or FAQs."
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass}>First AI Message</label>
                        <textarea
                          className={`${inputClass} min-h-24 resize-y`}
                          value={form.firstAiMessage}
                          onChange={(event) => updateField("firstAiMessage", event.target.value)}
                          placeholder="Hi! Thanks for reaching out. How can I help today?"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "billing" && (
                <div className={cardClass}>
                  <SectionTitle
                    icon={CreditCard}
                    step="Billing"
                    title="Current Plan"
                    description="This only shows the real subscription fields available on the account."
                  />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <InfoTile label="Plan" value={settings?.billing?.subscriptionPlan || "No plan saved"} />
                    <InfoTile label="Status" value={settings?.billing?.subscriptionStatus || "No status saved"} />
                    <InfoTile
                      label="Portal"
                      value={settings?.billing?.customerPortalUrl ? "Available" : "Not available"}
                    />
                  </div>
                  {settings?.billing?.customerPortalUrl ? (
                    <Button
                      className="mt-5 bg-[#fe901d] text-white hover:bg-[#e67e0d]"
                      onClick={() => window.open(settings.billing.customerPortalUrl, "_blank")}
                    >
                      Open billing portal
                    </Button>
                  ) : (
                    <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
                      No billing portal URL is saved for this user yet.
                    </p>
                  )}
                </div>
              )}

              {activeTab === "integrations" && (
                <div className={cardClass}>
                  <SectionTitle
                    icon={ShieldCheck}
                    step="Integrations"
                    title="Workspace Connections"
                    description="Only real QuicReply integration states are shown here."
                  />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <InfoTile
                      label="WhatsApp QR"
                      value={qrConnected ? "Connected" : "Not connected"}
                      tone={qrConnected ? "success" : "warning"}
                    />
                    <InfoTile
                      label="Official API"
                      value={apiStatus === "approved" ? "Approved" : apiStatus === "pending" ? "Pending" : "Not setup"}
                      tone={apiStatus === "approved" ? "success" : "warning"}
                    />
                    <InfoTile
                      label="Jennifer"
                      value={form.isAiActive ? "Active" : "Paused"}
                      tone={form.isAiActive ? "success" : "warning"}
                    />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      className="gap-2 bg-[#fe901d] text-white hover:bg-[#e67e0d]"
                      onClick={() => (window.location.href = "/whatsapp")}
                    >
                      <Smartphone className="h-4 w-4" />
                      Manage WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => (window.location.href = "/whatsapp/setup")}
                    >
                      <Zap className="h-4 w-4" />
                      Open API setup
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <div className={cardClass}>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Account Snapshot
                </h3>
                <div className="mt-4 space-y-3 text-sm">
                  <InfoLine label="Staff" value={staffDisplayName} />
                  <InfoLine label="Email" value={staffEmail || "Not saved"} />
                  <InfoLine label="Role" value={role} />
                  <InfoLine label="Currency" value={`${form.currency} (${settings?.preferences?.currencySymbol ?? ""})`} />
                </div>
              </div>

              <div className={cardClass}>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  System Status
                </h3>
                <div className="mt-4 space-y-3 text-sm">
                  <InfoLine label="WhatsApp mode" value={settings?.organization?.whatsappMode || "qr"} />
                  <InfoLine label="QR status" value={qrConnected ? "Connected" : "Not connected"} />
                  <InfoLine label="API status" value={apiStatus === "none" ? "Not setup" : apiStatus} />
                  <InfoLine label="Jennifer" value={form.isAiActive ? "Active" : "Paused"} />
                </div>
              </div>

            </aside>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

function InfoLine(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500 dark:text-slate-400">{props.label}</span>
      <span className="text-right font-semibold text-slate-900 dark:text-white">
        {props.value}
      </span>
    </div>
  );
}

function InfoTile(props: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  const toneClass =
    props.tone === "success"
      ? "text-emerald-700 dark:text-emerald-300"
      : props.tone === "warning"
        ? "text-[#c96a00] dark:text-[#ffb84d]"
        : "text-slate-900 dark:text-white";

  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-white/10">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {props.label}
      </p>
      <p className={`mt-2 text-lg font-bold ${toneClass}`}>{props.value}</p>
    </div>
  );
}

export default SettingsPage;
