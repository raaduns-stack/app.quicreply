import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import { getWorkspaceSettings, useQuery } from "wasp/client/operations";
import {
  BookOpen,
  CircleDot,
  FileStack,
  Loader2,
  RefreshCcw,
  Sparkles,
  Upload,
} from "lucide-react";
import UserLayout from "./layout/UserLayout";
import {
  AiTabs,
  mutedCardClass,
  sectionEyebrowClass,
  shellCardClass,
  type WorkspaceSettings,
} from "./ai/shared";
import { Button } from "../client/components/ui/button";
import { toast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";

export default function AiKnowledgePage({ user }: { user: AuthUser }) {
  const settingsQuery = useQuery(getWorkspaceSettings);
  const settings = settingsQuery.data as WorkspaceSettings | undefined;

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
  ];

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">
              Knowledge Base
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage the business knowledge Jennifer should rely on. File ingestion is still next; current knowledge comes from saved workspace settings.
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

        {settingsQuery.isLoading ? (
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
                    Jennifer is currently trained from workspace settings: business context, products/services, opening message, and AI response controls. Dedicated document upload, FAQ ingestion, and retrieval ranking are still pending.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link to="/ai/setup">Open Setup</Link>
                </Button>
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
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
                    Recommended next backend step
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Define S3-compatible object storage, metadata rows for uploaded sources, and an ingestion contract before turning on real file upload here.
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
