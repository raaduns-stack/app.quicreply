import { useEffect, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  getWorkspaceSettings,
  updateWorkspaceSettings,
  useAction,
  useQuery,
} from "wasp/client/operations";
import { Bell, Bot, Loader2, Save, ShieldCheck, Tags, Zap } from "lucide-react";
import UserLayout from "./layout/UserLayout";
import {
  AiTabs,
  buildWorkspaceSettingsInput,
  mutedCardClass,
  sectionEyebrowClass,
  shellCardClass,
  type WorkspaceSettings,
} from "./ai/shared";
import { Button } from "../client/components/ui/button";
import { Switch } from "../client/components/ui/switch";
import { toast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";

type SettingsForm = {
  isAiActive: boolean;
  saveNewChats: boolean;
  autoTag: boolean;
  notificationsEnabled: boolean;
  autoConfigureSystem: boolean;
};

function SettingsRow({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  icon: typeof Bot;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#efe5d5] bg-white px-4 py-4 dark:border-white/10 dark:bg-[#111b2d]">
      <div className="flex min-w-0 items-start gap-3">
        <div className="rounded-2xl bg-[#fff3e1] p-3 text-[#fe901d] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[#182235] dark:text-white">{label}</div>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function AiSettingsPage({ user }: { user: AuthUser }) {
  const settingsQuery = useQuery(getWorkspaceSettings);
  const saveSettings = useAction(updateWorkspaceSettings);
  const settings = settingsQuery.data as WorkspaceSettings | undefined;
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setForm({
      isAiActive: settings.organization.isAiActive,
      saveNewChats: settings.preferences.saveNewChats,
      autoTag: settings.preferences.autoTag,
      notificationsEnabled: settings.preferences.notificationsEnabled,
      autoConfigureSystem: settings.preferences.autoConfigureSystem,
    });
  }, [settings]);

  async function handleSave() {
    if (!settings || !form) {
      return;
    }

    setIsSaving(true);
    try {
      await saveSettings(
        buildWorkspaceSettingsInput(settings, {
          isAiActive: form.isAiActive,
          saveNewChats: form.saveNewChats,
          autoTag: form.autoTag,
          notificationsEnabled: form.notificationsEnabled,
          autoConfigureSystem: form.autoConfigureSystem,
        }),
      );
      toast({ title: "AI settings saved" });
    } catch (error: any) {
      toast({
        title: "Unable to save AI settings",
        description: error?.message ?? "Try again after the current request finishes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">
              AI Settings
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Control Jennifer’s core behavior using the workspace flags that already exist today.
            </p>
          </div>
          <Button className="gap-2" disabled={isSaving || !form} onClick={handleSave}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </div>

        <AiTabs currentHref="/ai/settings" />

        {settingsQuery.isLoading || !form ? (
          <div className={cn(shellCardClass, "flex items-center gap-3 px-5 py-8")}>
            <Loader2 className="h-5 w-5 animate-spin text-[#fe901d]" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Loading AI settings
            </span>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <SettingsRow
                checked={form.isAiActive}
                description="Master switch for Jennifer across the workspace."
                icon={Bot}
                label="Jennifer AI"
                onCheckedChange={(next) =>
                  setForm((current) => (current ? { ...current, isAiActive: next } : current))
                }
              />
              <SettingsRow
                checked={form.saveNewChats}
                description="Persist newly discovered chats into the CRM automatically."
                icon={ShieldCheck}
                label="Save New Chats"
                onCheckedChange={(next) =>
                  setForm((current) =>
                    current ? { ...current, saveNewChats: next } : current,
                  )
                }
              />
              <SettingsRow
                checked={form.autoTag}
                description="Apply automatic conversation/contact tags when signals are detected."
                icon={Tags}
                label="Auto Tag"
                onCheckedChange={(next) =>
                  setForm((current) => (current ? { ...current, autoTag: next } : current))
                }
              />
              <SettingsRow
                checked={form.notificationsEnabled}
                description="Keep operational notifications active when important automation events happen."
                icon={Bell}
                label="Notifications"
                onCheckedChange={(next) =>
                  setForm((current) =>
                    current ? { ...current, notificationsEnabled: next } : current,
                  )
                }
              />
              <SettingsRow
                checked={form.autoConfigureSystem}
                description="Allow the workspace to apply helper defaults for AI-related setup flows."
                icon={Zap}
                label="Auto Configure System"
                onCheckedChange={(next) =>
                  setForm((current) =>
                    current ? { ...current, autoConfigureSystem: next } : current,
                  )
                }
              />
            </div>

            <div className="space-y-6">
              <section className={cn(shellCardClass, "p-5")}>
                <div className={sectionEyebrowClass}>Current Workspace State</div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400">WhatsApp Mode</dt>
                    <dd className="font-semibold capitalize text-[#182235] dark:text-white">
                      {settings?.organization.whatsappMode}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400">QR Session</dt>
                    <dd className="font-semibold text-[#182235] dark:text-white">
                      {settings?.organization.qrConnected ? "Connected" : "Not connected"}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400">Official API</dt>
                    <dd className="font-semibold capitalize text-[#182235] dark:text-white">
                      {settings?.organization.apiStatus}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className={cn(mutedCardClass, "p-5")}>
                <div className="text-base font-semibold text-[#182235] dark:text-white">
                  Scope of this page
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  These controls are real because they map directly onto the existing workspace settings contract. Advanced Jennifer policies like fallback prompts, confidence thresholds, and human handoff routing still need dedicated backend design.
                </p>
              </section>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
}
