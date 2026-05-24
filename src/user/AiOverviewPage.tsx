import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Layers3,
  Loader2,
  MessageSquareText,
  Rocket,
  Settings2,
  Sparkles,
  TimerReset,
  Waypoints,
  Wifi,
} from "lucide-react";
import {
  getDashboardSummary,
  getWhatsAppWorkspaceState,
  getWorkspaceSettings,
  useQuery,
} from "wasp/client/operations";
import UserLayout from "./layout/UserLayout";
import { Button } from "../client/components/ui/button";
import { cn } from "../client/utils";
import { AiTabs } from "./ai/shared";

type DashboardSummary = {
  organizationName: string;
  staffDisplayName: string;
  currency: string;
  messagesReceived: number;
  leadsCaptured: number;
  aiResponses: number;
  revenueInPipeline: number;
  unreadMessages: number;
  qrConnected: boolean;
  apiStatus: "none" | "pending" | "approved";
  isAiActive: boolean;
  recentActivities: Array<{
    id: string;
    label: string;
    time: string;
    badge: "LEAD" | "AI" | "MESSAGE" | "CAMPAIGN" | "QR";
  }>;
};

type WhatsAppWorkspaceState = {
  whatsappMode: "qr" | "api" | "both";
  isAiActive: boolean;
  metrics: {
    totalMessages: number;
    activeSessions: number;
    qrUsageToday: number;
    aiReplies: number;
  };
  qr: {
    status: "disconnected" | "pending" | "connected" | "expired" | "failed";
    connected: boolean;
  };
  api: {
    status: "none" | "pending" | "approved";
    phoneNumber: string | null;
    messagingLimit: string | null;
  };
  webhook: {
    inboundUrl: string | null;
    enabled: boolean;
  };
};

type WorkspaceSettings = {
  organization: {
    businessDescription: string;
    productsServices: string;
    firstAiMessage: string;
    isAiActive: boolean;
  };
  preferences: {
    responseStyle: "professional" | "friendly" | "formal";
    aiLanguage: "english" | "yoruba" | "spanish";
  };
  billing: {
    subscriptionPlan: string | null;
    subscriptionStatus: string | null;
  };
};

const shellCardClass =
  "rounded-2xl border border-[#e6e0d6] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none";

const sectionTitleClass =
  "text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400";

function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatHours(value: number) {
  if (value >= 100) {
    return `${Math.round(value)}h`;
  }

  return `${value.toFixed(value < 10 ? 1 : 0)}h`;
}

function summarizeText(value: string, fallback: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

function statusTone(active: boolean) {
  return active
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20"
    : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-300 dark:ring-white/10";
}

export default function AiOverviewPage({ user }: { user: AuthUser }) {
  const dashboardQuery = useQuery(getDashboardSummary);
  const workspaceQuery = useQuery(getWhatsAppWorkspaceState);
  const settingsQuery = useQuery(getWorkspaceSettings);

  const dashboard = dashboardQuery.data as DashboardSummary | undefined;
  const workspace = workspaceQuery.data as WhatsAppWorkspaceState | undefined;
  const settings = settingsQuery.data as WorkspaceSettings | undefined;

  const isLoading =
    dashboardQuery.isLoading || workspaceQuery.isLoading || settingsQuery.isLoading;

  const aiResponseRate = formatPercent(
    ((dashboard?.aiResponses ?? 0) / Math.max(1, dashboard?.messagesReceived ?? 0)) *
      100,
  );
  const humanTakeoverRate = Math.max(0, 100 - aiResponseRate);
  const automationScore = formatPercent(
    ((workspace?.metrics.aiReplies ?? dashboard?.aiResponses ?? 0) /
      Math.max(1, workspace?.metrics.totalMessages ?? dashboard?.messagesReceived ?? 0)) *
      100,
  );
  const estimatedHoursSaved =
    ((workspace?.metrics.aiReplies ?? dashboard?.aiResponses ?? 0) * 2.5) / 60;
  const isAiActive = workspace?.isAiActive ?? settings?.organization.isAiActive ?? false;
  const hasKnowledge =
    Boolean(settings?.organization.businessDescription.trim()) ||
    Boolean(settings?.organization.productsServices.trim()) ||
    Boolean(settings?.organization.firstAiMessage.trim());

  const knowledgeItems = [
    {
      title: "Business Context",
      description: summarizeText(
        settings?.organization.businessDescription ?? "",
        "Add business description in Settings so Jennifer knows what the company sells.",
      ),
      icon: Brain,
      tone:
        "bg-[#fff6e8] text-[#fe901d] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]",
      active: Boolean(settings?.organization.businessDescription.trim()),
    },
    {
      title: "Products & Services",
      description: summarizeText(
        settings?.organization.productsServices ?? "",
        "Define products, offer structure, and customer use-cases in Settings.",
      ),
      icon: Layers3,
      tone:
        "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
      active: Boolean(settings?.organization.productsServices.trim()),
    },
    {
      title: "Opening Message",
      description: summarizeText(
        settings?.organization.firstAiMessage ?? "",
        "Set Jennifer’s first-response style and first message in Settings.",
      ),
      icon: MessageSquareText,
      tone:
        "bg-orange-50 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300",
      active: Boolean(settings?.organization.firstAiMessage.trim()),
    },
    {
      title: "Response Controls",
      description: `Style: ${settings?.preferences.responseStyle ?? "professional"} · Language: ${settings?.preferences.aiLanguage ?? "english"}`,
      icon: Settings2,
      tone:
        "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300",
      active: true,
    },
  ];

  const recommendations = [
    !hasKnowledge
      ? {
          title: "Add business context",
          body: "Jennifer needs business description, products, and first message context before automation quality can improve.",
          href: "/settings",
          cta: "Open Settings",
        }
      : null,
    workspace?.api.status !== "approved"
      ? {
          title: "Prepare Official API",
          body: "Campaign execution and reliable AI handoff improve once the Official WhatsApp API path is ready.",
          href: "/whatsapp/setup",
          cta: "Open API Setup",
        }
      : null,
    {
      title: "Review Campaign handoff",
      body: "Campaign queueing and n8n status callbacks are wired. The next operational test is one real launch round trip.",
      href: "/campaigns",
      cta: "Open Campaigns",
    },
  ].filter(Boolean) as Array<{
    title: string;
    body: string;
    href: string;
    cta: string;
  }>;

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">
              AI / Jennifer
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Automate conversations, qualify leads, and keep response quality in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                statusTone(isAiActive),
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isAiActive ? "bg-emerald-500" : "bg-slate-400",
                )}
              />
              {isAiActive ? "AI Active" : "AI Paused"}
            </span>
            <Button asChild variant="outline">
              <Link to="/settings">Manage Jennifer</Link>
            </Button>
            <Button asChild>
              <Link to="/whatsapp">Open WhatsApp</Link>
            </Button>
          </div>
        </div>

        <AiTabs currentHref="/ai" />

        {isLoading ? (
          <div className={cn(shellCardClass, "flex items-center gap-3 px-5 py-8")}>
            <Loader2 className="h-5 w-5 animate-spin text-[#fe901d]" />
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Loading Jennifer overview
            </span>
          </div>
        ) : (
          <>
            <section className={cn(shellCardClass, "overflow-hidden")}>
              <div className="flex flex-wrap items-center justify-between gap-6 px-6 py-6">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fff3e1] text-[#fe901d] ring-1 ring-[#f2dfbe] dark:bg-[#fe901d]/10 dark:text-[#ffb84d] dark:ring-[#fe901d]/20">
                    <Bot className="h-7 w-7" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-[#182235] dark:text-white">
                        Jennifer
                      </h2>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          statusTone(isAiActive),
                        )}
                      >
                        {isAiActive ? "Active" : "Paused"}
                      </span>
                      <span className="rounded-full bg-[#fff3e1] px-2.5 py-1 text-[11px] font-semibold text-[#c96a00] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]">
                        {automationScore}% automated
                      </span>
                    </div>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                      {settings?.organization.businessDescription?.trim()
                        ? summarizeText(settings.organization.businessDescription, "")
                        : "Jennifer is configured to manage inbound conversation flow, qualify intent, and hand off the right context into pipeline and campaign workflows."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full border-[10px] border-[#fe901d] bg-[#fffaf3] text-center shadow-sm dark:bg-[#0b1324]">
                    <span className="text-2xl font-bold text-[#182235] dark:text-white">
                      {aiResponseRate}%
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Success
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button asChild>
                      <Link to="/campaigns">Review Campaigns</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/settings">Update Context</Link>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 border-t border-[#efe7da] px-6 py-4 md:grid-cols-2 dark:border-white/10">
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    <span>AI Conversations</span>
                    <span className="text-[#182235] dark:text-white">{aiResponseRate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f3efe7] dark:bg-white/10">
                    <div
                      className="h-2 rounded-full bg-[#fe901d]"
                      style={{ width: `${aiResponseRate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    <span>Human Takeover</span>
                    <span className="text-[#182235] dark:text-white">
                      {humanTakeoverRate}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f3efe7] dark:bg-white/10">
                    <div
                      className="h-2 rounded-full bg-slate-300 dark:bg-slate-500"
                      style={{ width: `${humanTakeoverRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Leads Qualified",
                  value: (dashboard?.leadsCaptured ?? 0).toLocaleString(),
                  sub: `${dashboard?.unreadMessages ?? 0} unread remaining`,
                  icon: Sparkles,
                  tone:
                    "bg-[#fff3e1] text-[#fe901d] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]",
                },
                {
                  label: "AI Response Rate",
                  value: `${aiResponseRate}%`,
                  sub: `${workspace?.metrics.aiReplies ?? dashboard?.aiResponses ?? 0} AI replies`,
                  icon: Rocket,
                  tone:
                    "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
                },
                {
                  label: "Time Saved",
                  value: formatHours(estimatedHoursSaved),
                  sub: "Estimated from automated replies",
                  icon: TimerReset,
                  tone:
                    "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
                },
                {
                  label: "Conversations",
                  value: (workspace?.metrics.totalMessages ?? dashboard?.messagesReceived ?? 0).toLocaleString(),
                  sub: `${workspace?.metrics.activeSessions ?? 0} active sessions`,
                  icon: MessageSquareText,
                  tone:
                    "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
                },
              ].map((item) => (
                <div key={item.label} className={cn(shellCardClass, "p-5")}>
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl",
                        item.tone,
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className={sectionTitleClass}>{item.label}</p>
                      <p className="mt-1 text-2xl font-bold text-[#182235] dark:text-white">
                        {item.value}
                      </p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {item.sub}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-4">
                <div className={cn(shellCardClass, "overflow-hidden")}>
                  <div className="border-b border-[#efe7da] px-5 py-4 dark:border-white/10">
                    <h3 className="text-sm font-bold text-[#182235] dark:text-white">
                      Connection Status
                    </h3>
                  </div>
                  <div className="divide-y divide-[#f1ece3] dark:divide-white/10">
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff3e1] text-[#fe901d] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]">
                        <Wifi className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#182235] dark:text-white">
                          WhatsApp Session
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {workspace?.qr.connected
                            ? `Connected · ${workspace.whatsappMode.toUpperCase()} mode`
                            : "Disconnected or waiting for QR connection"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          statusTone(Boolean(workspace?.qr.connected)),
                        )}
                      >
                        {workspace?.qr.connected ? "Connected" : "Offline"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff8ee] text-[#c96a00] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]">
                        <Waypoints className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#182235] dark:text-white">
                          Official API
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {workspace?.api.status === "approved"
                            ? `Active${workspace.api.phoneNumber ? ` · ${workspace.api.phoneNumber}` : ""}`
                            : workspace?.api.status === "pending"
                              ? "Pending Meta approval"
                              : "Not configured yet"}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          workspace?.api.status === "approved"
                            ? statusTone(true)
                            : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
                        )}
                      >
                        {workspace?.api.status === "approved"
                          ? "Active"
                          : workspace?.api.status === "pending"
                            ? "Pending"
                            : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={cn(shellCardClass, "overflow-hidden")}>
                  <div className="flex items-center justify-between border-b border-[#efe7da] px-5 py-4 dark:border-white/10">
                    <div>
                      <h3 className="text-sm font-bold text-[#182235] dark:text-white">
                        Knowledge Base
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Jennifer learns from business context already stored in QuicReply.
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/settings">Manage</Link>
                    </Button>
                  </div>
                  <div className="divide-y divide-[#f1ece3] dark:divide-white/10">
                    {knowledgeItems.map((item) => (
                      <div key={item.title} className="flex gap-3 px-5 py-4">
                        <div
                          className={cn(
                            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            item.tone,
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#182235] dark:text-white">
                              {item.title}
                            </p>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                item.active
                                  ? statusTone(true)
                                  : "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-400 dark:ring-white/10",
                              )}
                            >
                              {item.active ? "Active" : "Missing"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className={cn(shellCardClass, "overflow-hidden")}>
                  <div className="flex items-center justify-between border-b border-[#efe7da] px-5 py-4 dark:border-white/10">
                    <div>
                      <h3 className="text-sm font-bold text-[#182235] dark:text-white">
                        Jennifer Activity Feed
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Recent automation and message activity across the workspace.
                      </p>
                    </div>
                  </div>
                  <div className="divide-y divide-[#f1ece3] dark:divide-white/10">
                    {(dashboard?.recentActivities ?? []).slice(0, 6).map((activity) => (
                      <div key={activity.id} className="flex gap-3 px-5 py-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff3e1] text-[#fe901d] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]">
                          <CircleDot className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#182235] dark:text-white">
                                {activity.label}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                {activity.badge}
                              </p>
                            </div>
                            <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                              {activity.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!(dashboard?.recentActivities?.length) ? (
                      <div className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
                        No recent AI activity yet.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-[#f0dfbf] bg-[#fff9ef] p-5 dark:border-[#fe901d]/20 dark:bg-[#fe901d]/8">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#fe901d]" />
                      <p className="text-sm font-bold text-[#182235] dark:text-white">
                        Jennifer Plan
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {(settings?.billing.subscriptionPlan ?? "growth").toUpperCase()} plan
                      {" · "}
                      {isAiActive ? "AI enabled" : "AI paused"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Subscription status: {settings?.billing.subscriptionStatus ?? "trial"}
                    </p>
                    <Button asChild className="mt-4" size="sm" variant="outline">
                      <Link to="/billing">Manage Plan</Link>
                    </Button>
                  </div>

                  <div className={cn(shellCardClass, "p-5")}>
                    <p className="text-sm font-bold text-[#182235] dark:text-white">
                      Quick Actions
                    </p>
                    <div className="mt-4 space-y-2">
                      {[
                        { label: "Open Settings", href: "/settings", icon: Settings2 },
                        { label: "Open WhatsApp", href: "/whatsapp", icon: Wifi },
                        { label: "Review Campaigns", href: "/campaigns", icon: Rocket },
                      ].map((action) => (
                        <Link
                          key={action.label}
                          className="flex items-center justify-between rounded-xl border border-[#e6e0d6] bg-[#faf7f1] px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-[#fff3e1] hover:text-[#182235] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-200 dark:hover:bg-white/5"
                          to={action.href}
                        >
                          <span className="flex items-center gap-2">
                            <action.icon className="h-4 w-4 text-[#fe901d]" />
                            {action.label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {recommendations.map((recommendation) => (
                    <div
                      key={recommendation.title}
                      className="rounded-2xl border border-[#e6e0d6] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#fe901d]" />
                        <p className="text-sm font-bold text-[#182235] dark:text-white">
                          {recommendation.title}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        {recommendation.body}
                      </p>
                      <Button asChild className="mt-4" size="sm" variant="outline">
                        <Link to={recommendation.href}>{recommendation.cta}</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </UserLayout>
  );
}
