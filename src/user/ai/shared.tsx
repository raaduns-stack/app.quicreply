import { NavLink } from "react-router";
import { cn } from "../../client/utils";

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
    responseStyle: "professional" | "friendly" | "formal";
    aiLanguage: "english" | "yoruba" | "spanish";
  };
  billing: {
    subscriptionPlan: string | null;
    subscriptionStatus: string | null;
    customerPortalUrl: string | null;
  };
};

export type WorkspaceSettingsInput = {
  firstName?: string;
  lastName?: string;
  organizationName: string;
  phoneNumber?: string;
  industry?: string;
  country?: string;
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
  businessDescription?: string;
  productsServices?: string;
  firstAiMessage?: string;
};

export const aiNavItems = [
  { label: "Overview", href: "/ai" },
  { label: "Setup", href: "/ai/setup" },
  { label: "Knowledge Base", href: "/ai/knowledge" },
  { label: "Test AI", href: "/ai/test" },
  { label: "Settings", href: "/ai/settings" },
] as const;

export const shellCardClass =
  "rounded-2xl border border-[#e6e0d6] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none";

export const mutedCardClass =
  "rounded-2xl border border-[#f0e7d6] bg-[#fffaf2] shadow-sm dark:border-white/10 dark:bg-[#111b2d]";

export const sectionEyebrowClass =
  "text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400";

export const inputClass =
  "border-[#e4ddd2] bg-white text-sm text-[#182235] placeholder:text-slate-400 focus-visible:ring-[#fe901d] dark:border-white/10 dark:bg-[#0f1728] dark:text-white dark:placeholder:text-slate-500";

export function buildWorkspaceSettingsInput(
  settings: WorkspaceSettings,
  overrides: Partial<WorkspaceSettingsInput>,
): WorkspaceSettingsInput {
  return {
    firstName: settings.staff.firstName || undefined,
    lastName: settings.staff.lastName || undefined,
    organizationName: settings.organization.name,
    phoneNumber: settings.organization.phoneNumber || undefined,
    industry: settings.organization.industry || undefined,
    country: settings.organization.country || undefined,
    currency: settings.preferences.currency as WorkspaceSettingsInput["currency"],
    timezone: settings.preferences.timezone,
    saveNewChats: settings.preferences.saveNewChats,
    autoTag: settings.preferences.autoTag,
    notificationsEnabled: settings.preferences.notificationsEnabled,
    autoConfigureSystem: settings.preferences.autoConfigureSystem,
    isAiActive: settings.organization.isAiActive,
    responseStyle: settings.preferences.responseStyle,
    aiLanguage: settings.preferences.aiLanguage,
    businessDescription: settings.organization.businessDescription || undefined,
    productsServices: settings.organization.productsServices || undefined,
    firstAiMessage: settings.organization.firstAiMessage || undefined,
    ...overrides,
  };
}

export function AiTabs({ currentHref }: { currentHref: string }) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-[#e6e0d6] pb-3 dark:border-white/10">
      {aiNavItems.map((item) => {
        const isCurrent = item.href === currentHref;

        return (
          <NavLink
            key={item.href}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              isCurrent
                ? "bg-[#fff3e1] text-[#c96a00] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]"
                : "text-slate-500 hover:bg-[#fff7ec] hover:text-[#182235] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white",
            )}
            to={item.href}
          >
            {item.label}
          </NavLink>
        );
      })}
    </div>
  );
}
