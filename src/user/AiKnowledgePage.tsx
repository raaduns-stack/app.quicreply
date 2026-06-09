import { useEffect, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import { getWorkspaceSettings, updateWorkspaceSettings, useAction, useQuery } from "wasp/client/operations";
import {
  BookOpen,
  CircleDot,
  FileStack,
  Loader2,
  RefreshCcw,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
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
import { type AiKnowledgeBase } from "./ai/knowledgeDefaults";
import { Button } from "../client/components/ui/button";
import { Textarea } from "../client/components/ui/textarea";
import { toast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";

export default function AiKnowledgePage({ user }: { user: AuthUser }) {
  const settingsQuery = useQuery(getWorkspaceSettings);
  const saveSettings = useAction(updateWorkspaceSettings);
  const settings = settingsQuery.data as WorkspaceSettings | undefined;
  const [knowledge, setKnowledge] = useState<AiKnowledgeBase | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setKnowledge(settings.aiKnowledge);
  }, [settings]);

  const entries = [
    {
      label: "Business Context",
      type: "Core",
      status: settings?.organization.businessDescription.trim() ? "Synced" : "Missing",
      description:
        settings?.organization.businessDescription.trim() ||
        "Add business context in Setup so Jennifer knows the brand narrative.",
    },
    {
      label: "Products & Services",
      type: "Catalog",
      status: settings?.organization.productsServices.trim() ? "Synced" : "Missing",
      description:
        settings?.organization.productsServices.trim() ||
        "Define products, offers, and fulfillment details in Setup.",
    },
    {
      label: "Opening Message",
      type: "Conversation",
      status: settings?.organization.firstAiMessage.trim() ? "Synced" : "Missing",
      description:
        settings?.organization.firstAiMessage.trim() ||
        "Set the first AI message so new chats start with the right tone.",
    },
    {
      label: "Structured Product Knowledge",
      type: "Reference",
      status: knowledge ? "Synced" : "Missing",
      description:
        "Pricing, plan limits, feature explanations, page guidance, and answer boundaries Jennifer should use during test replies.",
    },
  ];

  async function handleSaveKnowledge() {
    if (!settings || !knowledge) {
      return;
    }

    setIsSaving(true);
    try {
      await saveSettings(
        buildWorkspaceSettingsInput(settings, {
          aiKnowledge: {
            pricingAndPlans: knowledge.pricingAndPlans.trim(),
            seatsAndLimits: knowledge.seatsAndLimits.trim(),
            coreFeatures: knowledge.coreFeatures.trim(),
            productPages: knowledge.productPages.trim(),
            policiesAndFaqs: knowledge.policiesAndFaqs.trim(),
          },
        }),
      );
      toast({ title: "Jennifer knowledge saved" });
    } catch (error: any) {
      toast({
        title: "Unable to save knowledge",
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
              Knowledge Base
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage the business knowledge Jennifer should rely on. File ingestion is still next; current knowledge comes from saved workspace settings and this structured reference layer.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() =>
                toast({
                  title: "Knowledge sync is local for now",
                  description: "Document upload and ingestion will sit behind this button next.",
                })
              }
              variant="outline"
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Sync
            </Button>
            <Button
              onClick={() =>
                toast({
                  title: "Upload flow is not wired yet",
                  description: "We are keeping this UI-first until storage and ingestion are defined.",
                })
              }
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Knowledge
            </Button>
          </div>
        </div>

        <AiTabs currentHref="/ai/knowledge" />

        {settingsQuery.isLoading || !knowledge ? (
          <div className={cn(shellCardClass, "flex items-center gap-3 px-5 py-8")}>
            <Loader2 className="h-5 w-5 animate-spin text-[#fe901d]" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Loading knowledge base
            </span>
          </div>
        ) : (
          <>
            <section className={cn(mutedCardClass, "p-5")}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="rounded-2xl bg-white p-3 text-[#fe901d] shadow-sm dark:bg-[#0f1728] dark:text-[#ffb84d]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="text-base font-semibold text-[#182235] dark:text-white">
                    Current source of truth
                  </div>
                  <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Jennifer is currently trained from workspace settings plus this structured knowledge layer: business context, products/services, opening message, pricing and plans, feature explanations, and page guidance. Dedicated document upload, FAQ ingestion, and retrieval ranking are still pending.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link to="/ai/setup">Open Setup</Link>
                </Button>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">
                <section className={cn(shellCardClass, "overflow-hidden")}>
                  <div className="border-b border-[#efe5d5] px-5 py-4 dark:border-white/10">
                    <div className={sectionEyebrowClass}>Knowledge Sources</div>
                    <div className="mt-1 text-base font-semibold text-[#182235] dark:text-white">
                      Active business context feeding Jennifer
                    </div>
                  </div>
                  <div className="divide-y divide-[#f4ede2] dark:divide-white/10">
                    {entries.map((entry) => (
                      <div
                        key={entry.label}
                        className="flex flex-wrap items-start justify-between gap-4 px-5 py-4"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="rounded-xl bg-[#fff3e1] p-2 text-[#fe901d] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#182235] dark:text-white">
                              {entry.label}
                            </div>
                            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                              {entry.description}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2 text-right">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {entry.type}
                          </div>
                          <span
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
                              entry.status === "Synced"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20"
                                : "bg-[#fff3e1] text-[#c96a00] ring-1 ring-[#f3dfbf] dark:bg-[#fe901d]/10 dark:text-[#ffb84d] dark:ring-[#fe901d]/20",
                            )}
                          >
                            <CircleDot className="h-3.5 w-3.5" />
                            {entry.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className={cn(shellCardClass, "p-5")}>
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className={sectionEyebrowClass}>Structured Knowledge</div>
                      <div className="mt-1 text-base font-semibold text-[#182235] dark:text-white">
                        Facts Jennifer can safely rely on
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        Keep pricing, plans, limits, feature explanations, and page guidance here so `/ai/test` can answer from known facts instead of guessing.
                      </p>
                    </div>
                    <Button className="gap-2" disabled={isSaving} onClick={handleSaveKnowledge}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Knowledge
                    </Button>
                  </div>

                  <div className="space-y-5">
                    {[
                      {
                        key: "pricingAndPlans" as const,
                        label: "Pricing & Plans",
                        placeholder:
                          "Explain the available plans, price points, what each includes, and how Jennifer should answer pricing questions safely.",
                      },
                      {
                        key: "seatsAndLimits" as const,
                        label: "Seats, Usage & Limits",
                        placeholder:
                          "List known seat counts, usage allowances, AI response limits, and what Jennifer should say when exact limits are unknown.",
                      },
                      {
                        key: "coreFeatures" as const,
                        label: "Core Features",
                        placeholder:
                          "Describe the main product capabilities Jennifer should mention when users ask what QuicReply does.",
                      },
                      {
                        key: "productPages" as const,
                        label: "Pages & Navigation",
                        placeholder:
                          "Describe what Dashboard, Inbox, Contacts, Pipeline, Campaigns, Billing, Analytics, and other pages are for.",
                      },
                      {
                        key: "policiesAndFaqs" as const,
                        label: "Policies & FAQ Rules",
                        placeholder:
                          "List the answer boundaries Jennifer must follow, such as not inventing prices or claiming live actions happened.",
                      },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className={sectionEyebrowClass}>{field.label}</label>
                        <Textarea
                          className={cn("mt-2 min-h-[132px]", inputClass)}
                          value={knowledge[field.key]}
                          onChange={(event) =>
                            setKnowledge((current) =>
                              current ? { ...current, [field.key]: event.target.value } : current,
                            )
                          }
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className={cn(shellCardClass, "p-5")}>
                  <div className="mb-4 flex items-start gap-3">
                    <div className="rounded-2xl bg-[#fff3e1] p-3 text-[#fe901d] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]">
                      <FileStack className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-[#182235] dark:text-white">
                        Upcoming ingestion layer
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        The UI is ready for the next storage design. The missing pieces are file storage, chunking, and retrieval strategy.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-[#e6d8bf] bg-[#fffaf2] px-5 py-8 text-center dark:border-white/10 dark:bg-[#111b2d]">
                    <Upload className="mx-auto h-8 w-8 text-[#fe901d]" />
                    <div className="mt-4 text-sm font-semibold text-[#182235] dark:text-white">
                      Upload zone placeholder
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      We have intentionally not connected uploads yet. That avoids accidental local/VPS file storage before the object-storage path is defined.
                    </p>
                  </div>
                </section>

                <section className={cn(mutedCardClass, "p-5")}>
                  <div className="text-base font-semibold text-[#182235] dark:text-white">
                    What `/ai/test` is for
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    This sandbox should test how Jennifer answers, explains the product, handles objections, and follows policies. It should simulate replies, not send live messages or confirm actions happened.
                  </p>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </UserLayout>
  );
}
