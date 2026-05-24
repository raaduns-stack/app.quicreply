import { useEffect, useMemo, useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  getWorkspaceSettings,
  updateWorkspaceSettings,
  useAction,
  useQuery,
} from "wasp/client/operations";
import { Bot, Loader2, MessageSquareText, Save, Sparkles, Store } from "lucide-react";
import UserLayout from "./layout/UserLayout";
import {
  AiTabs,
  buildWorkspaceSettingsInput,
  inputClass,
  mutedCardClass,
  sectionEyebrowClass,
  shellCardClass,
  type WorkspaceSettings,
} from "./ai/shared";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Textarea } from "../client/components/ui/textarea";
import { toast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";

type SetupForm = {
  organizationName: string;
  industry: string;
  businessDescription: string;
  productsServices: string;
  firstAiMessage: string;
  responseStyle: "professional" | "friendly" | "formal";
  aiLanguage: "english" | "yoruba" | "spanish";
  isAiActive: boolean;
};

const toneOptions: Array<{
  value: SetupForm["responseStyle"];
  title: string;
  description: string;
}> = [
  {
    value: "professional",
    title: "Professional",
    description: "Direct, polished, and safe for support or sales follow-up.",
  },
  {
    value: "friendly",
    title: "Friendly",
    description: "Warm, approachable, and conversational for day-to-day chats.",
  },
  {
    value: "formal",
    title: "Formal",
    description: "Structured and reserved for premium or compliance-heavy brands.",
  },
];

export default function AiSetupPage({ user }: { user: AuthUser }) {
  const settingsQuery = useQuery(getWorkspaceSettings);
  const saveSettings = useAction(updateWorkspaceSettings);
  const settings = settingsQuery.data as WorkspaceSettings | undefined;
  const [form, setForm] = useState<SetupForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setForm({
      organizationName: settings.organization.name,
      industry: settings.organization.industry,
      businessDescription: settings.organization.businessDescription,
      productsServices: settings.organization.productsServices,
      firstAiMessage: settings.organization.firstAiMessage,
      responseStyle: settings.preferences.responseStyle,
      aiLanguage: settings.preferences.aiLanguage,
      isAiActive: settings.organization.isAiActive,
    });
  }, [settings]);

  const completion = useMemo(() => {
    if (!form) {
      return 0;
    }

    const fields = [
      form.organizationName.trim(),
      form.industry.trim(),
      form.businessDescription.trim(),
      form.productsServices.trim(),
      form.firstAiMessage.trim(),
    ];

    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [form]);

  async function handleSave() {
    if (!settings || !form) {
      return;
    }

    setIsSaving(true);
    try {
      await saveSettings(
        buildWorkspaceSettingsInput(settings, {
          organizationName: form.organizationName.trim() || settings.organization.name,
          industry: form.industry.trim() || undefined,
          businessDescription: form.businessDescription.trim() || undefined,
          productsServices: form.productsServices.trim() || undefined,
          firstAiMessage: form.firstAiMessage.trim() || undefined,
          responseStyle: form.responseStyle,
          aiLanguage: form.aiLanguage,
          isAiActive: form.isAiActive,
        }),
      );
      toast({ title: "Jennifer setup saved" });
    } catch (error: any) {
      toast({
        title: "Unable to save Jennifer setup",
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
              AI / Jennifer Setup
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Set Jennifer’s business context, tone, and opening message before live automation.
            </p>
          </div>
          <Button className="gap-2" disabled={isSaving || !form} onClick={handleSave}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Setup
          </Button>
        </div>

        <AiTabs currentHref="/ai/setup" />

        {settingsQuery.isLoading || !form ? (
          <div className={cn(shellCardClass, "flex items-center gap-3 px-5 py-8")}>
            <Loader2 className="h-5 w-5 animate-spin text-[#fe901d]" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Loading Jennifer setup
            </span>
          </div>
        ) : (
          <>
            <div className={cn(mutedCardClass, "flex flex-wrap items-center justify-between gap-4 p-5")}>
              <div className="space-y-1">
                <div className={sectionEyebrowClass}>Setup Progress</div>
                <div className="text-lg font-semibold text-[#182235] dark:text-white">
                  {completion}% ready for live replies
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  This page persists to your existing workspace settings. No new AI schema is being invented here.
                </p>
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-8 border-[#fe901d] bg-white text-xl font-bold text-[#c96a00] dark:bg-[#0f1728] dark:text-[#ffb84d]">
                {completion}%
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <section className={cn(shellCardClass, "p-5")}>
                  <div className="mb-5 flex items-start gap-3">
                    <div className="rounded-2xl bg-[#fff3e1] p-3 text-[#fe901d] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-[#182235] dark:text-white">
                        Business Context
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Give Jennifer the baseline business context she needs to answer accurately.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className={sectionEyebrowClass}>Business Name</label>
                      <Input
                        className={cn("mt-2", inputClass)}
                        value={form.organizationName}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? { ...current, organizationName: event.target.value }
                              : current,
                          )
                        }
                        placeholder="e.g. QuicReply Hair Studio"
                      />
                    </div>

                    <div>
                      <label className={sectionEyebrowClass}>Industry</label>
                      <Input
                        className={cn("mt-2", inputClass)}
                        value={form.industry}
                        onChange={(event) =>
                          setForm((current) =>
                            current ? { ...current, industry: event.target.value } : current,
                          )
                        }
                        placeholder="e.g. Wigs & Hair, Real Estate, Electronics"
                      />
                    </div>

                    <div>
                      <label className={sectionEyebrowClass}>Brand Context</label>
                      <Textarea
                        className={cn("mt-2 min-h-[120px]", inputClass)}
                        value={form.businessDescription}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? { ...current, businessDescription: event.target.value }
                              : current,
                          )
                        }
                        placeholder="Describe what the business does, who it serves, and how Jennifer should position the brand."
                      />
                    </div>

                    <div>
                      <label className={sectionEyebrowClass}>Products & Services</label>
                      <Textarea
                        className={cn("mt-2 min-h-[140px]", inputClass)}
                        value={form.productsServices}
                        onChange={(event) =>
                          setForm((current) =>
                            current
                              ? { ...current, productsServices: event.target.value }
                              : current,
                          )
                        }
                        placeholder="List the products, pricing patterns, delivery notes, and high-intent questions Jennifer should handle."
                      />
                    </div>
                  </div>
                </section>

                <section className={cn(shellCardClass, "p-5")}>
                  <div className="mb-5 flex items-start gap-3">
                    <div className="rounded-2xl bg-[#fff7ec] p-3 text-[#fe901d] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-[#182235] dark:text-white">
                        Tone & Language
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Keep the voice aligned to the brand. This writes into your existing response-style settings.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {toneOptions.map((option) => {
                      const isActive = form.responseStyle === option.value;
                      return (
                        <button
                          key={option.value}
                          className={cn(
                            "rounded-2xl border p-4 text-left transition-colors",
                            isActive
                              ? "border-[#fe901d] bg-[#fff7ec] dark:border-[#fe901d]/70 dark:bg-[#fe901d]/10"
                              : "border-[#e6e0d6] hover:border-[#fe901d]/50 hover:bg-[#fffaf2] dark:border-white/10 dark:hover:bg-white/5",
                          )}
                          onClick={() =>
                            setForm((current) =>
                              current ? { ...current, responseStyle: option.value } : current,
                            )
                          }
                          type="button"
                        >
                          <div className="text-sm font-semibold text-[#182235] dark:text-white">
                            {option.title}
                          </div>
                          <div className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {option.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {(["english", "yoruba", "spanish"] as const).map((language) => (
                      <button
                        key={language}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-semibold capitalize transition-colors",
                          form.aiLanguage === language
                            ? "border-[#fe901d] bg-[#fff3e1] text-[#c96a00] dark:border-[#fe901d]/70 dark:bg-[#fe901d]/10 dark:text-[#ffb84d]"
                            : "border-[#e6e0d6] text-slate-500 hover:bg-[#fffaf2] dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5",
                        )}
                        onClick={() =>
                          setForm((current) =>
                            current ? { ...current, aiLanguage: language } : current,
                          )
                        }
                        type="button"
                      >
                        {language}
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className={cn(shellCardClass, "p-5")}>
                  <div className="mb-5 flex items-start gap-3">
                    <div className="rounded-2xl bg-[#fff3e1] p-3 text-[#fe901d] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]">
                      <MessageSquareText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-[#182235] dark:text-white">
                        Opening Message
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        This is the first-response baseline Jennifer should lean on during new conversations.
                      </p>
                    </div>
                  </div>
                  <Textarea
                    className={cn("min-h-[220px]", inputClass)}
                    value={form.firstAiMessage}
                    onChange={(event) =>
                      setForm((current) =>
                        current ? { ...current, firstAiMessage: event.target.value } : current,
                      )
                    }
                    placeholder="Hi, I'm Jennifer from QuicReply. Tell me what you're looking for and I'll help you right away."
                  />
                </section>

                <section className={cn(mutedCardClass, "p-5")}>
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 text-[#fe901d] shadow-sm dark:bg-[#0f1728] dark:text-[#ffb84d]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-semibold text-[#182235] dark:text-white">
                        Activation State
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        This writes to the same master AI toggle already used elsewhere in the workspace.
                      </p>
                      <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#f0ddba] bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0f1728]">
                        <div>
                          <div className="text-sm font-semibold text-[#182235] dark:text-white">
                            Jennifer AI
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {form.isAiActive ? "Ready to answer incoming chats." : "Paused until you switch it back on."}
                          </div>
                        </div>
                        <button
                          className={cn(
                            "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                            form.isAiActive
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20"
                              : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10",
                          )}
                          onClick={() =>
                            setForm((current) =>
                              current ? { ...current, isAiActive: !current.isAiActive } : current,
                            )
                          }
                          type="button"
                        >
                          {form.isAiActive ? "Active" : "Paused"}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </UserLayout>
  );
}
