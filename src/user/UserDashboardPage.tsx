import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Link } from "react-router";
import { type AuthUser } from "wasp/auth";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  QrCode,
  Rocket,
  Send,
  TrendingUp,
  UserPlus,
  Wifi,
} from "lucide-react";
import {
  getDashboardSummary,
  getWhatsAppWorkspaceState,
  refreshWhatsAppQrStatus,
  useQuery,
} from "wasp/client/operations";
import { Button } from "../client/components/ui/button";
import { cn } from "../client/utils";
import UserLayout from "./layout/UserLayout";

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;
type DashboardSummary = {
  organizationName: string;
  staffDisplayName: string;
  currency: {
    code: string;
    symbol: string;
  };
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
  recentConversations: Array<{
    id: string;
    name: string;
    initials: string;
    snippet: string;
    time: string;
    unread?: string;
  }>;
  lastCampaign: {
    id: string;
    name: string;
    status: string;
    sent: number;
    delivered: number;
    failed: number;
    createdAt: string;
  } | null;
  timeRange: DashboardTimeRange;
};
type DashboardTimeRange =
  | "current-week"
  | "today"
  | "last-7-days"
  | "current-month"
  | "all-time";
type WhatsAppWorkspaceState = {
  qr: {
    status: "disconnected" | "pending" | "connected" | "expired" | "failed";
    connected: boolean;
    disconnectReason:
      | "linked_device_lost"
      | "qr_expired"
      | "provider_error"
      | "manual_disconnect"
      | "disconnected"
      | null;
    checkedAt: string | null;
    lastError: string | null;
  };
  api: {
    status: "none" | "pending" | "approved";
  };
};
type DashboardStat = {
  label: string;
  value: string;
  delta: string;
  icon?: IconType;
  currencySymbol?: string;
  tone: "green" | "indigo" | "blue" | "amber";
};

const muted = "text-slate-500 dark:text-slate-400";
const strong = "text-[#182235] dark:text-white";
const orangeButton =
  "bg-[#fe901d] text-white shadow-lg shadow-[#fe901d]/20 hover:bg-[#e98214]";
const subtleButton =
  "border-[#e8e2d8] bg-white text-slate-700 hover:bg-[#fff8ee] dark:border-white/10 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-white/5";
const eyebrow =
  "text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400";

const dashboardTimeRangeOptions: Array<{
  value: DashboardTimeRange;
  label: string;
  helper: string;
}> = [
  { value: "current-week", label: "Current Week", helper: "This week" },
  { value: "today", label: "Today", helper: "Today" },
  { value: "last-7-days", label: "Last 7 Days", helper: "Last 7 days" },
  { value: "current-month", label: "This Month", helper: "This month" },
  { value: "all-time", label: "All Time", helper: "All time" },
];

function getTimeBasedGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return "Good morning";
  }

  if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  }

  if (hour >= 17 && hour < 21) {
    return "Good evening";
  }

  return "Good night";
}

function iconTone(tone: string) {
  if (tone === "green") {
    return "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300";
  }
  if (tone === "indigo") {
    return "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300";
  }
  if (tone === "blue") {
    return "bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300";
  }
  if (tone === "purple") {
    return "bg-purple-500/10 text-purple-600 dark:bg-purple-400/10 dark:text-purple-300";
  }
  if (tone === "slate") {
    return "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300";
  }
  return "bg-[#fff3e1] text-[#fe901d] dark:bg-[#fe901d]/15 dark:text-[#ffb84d]";
}

function badgeTone(tone: string) {
  if (tone === "green") {
    return "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300";
  }
  if (tone === "purple") {
    return "border-purple-200 bg-purple-50 text-purple-600 dark:border-purple-400/20 dark:bg-purple-400/10 dark:text-purple-300";
  }
  if (tone === "blue") {
    return "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300";
  }
  if (tone === "slate") {
    return "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-300";
  }
  return "border-[#ffd694] bg-[#fff7e8] text-[#d37500] dark:border-[#fe901d]/20 dark:bg-[#fe901d]/10 dark:text-[#ffb84d]";
}

function DashboardPill({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "green" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold",
        tone === "green"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
          : "border-[#f5d27a] bg-[#fff8e6] text-[#a75d00] dark:border-[#fe901d]/25 dark:bg-[#fe901d]/10 dark:text-[#ffb84d]",
      )}
    >
      {children}
    </span>
  );
}

function StatCard({ stat }: { stat: DashboardStat }) {
  const Icon = stat.icon;

  const bgColors = {
    green: "bg-emerald-500/10",
    indigo: "bg-indigo-500/10",
    blue: "bg-blue-500/10",
    amber: "bg-amber-500/10",
  };

  const accentColors = {
    green: "bg-emerald-500",
    indigo: "bg-indigo-600",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#e8e2d8] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-[3px] hover:shadow-lg dark:border-white/10 dark:bg-[#0d1524]">
      <div
        className={cn(
          "absolute top-0 left-0 h-[3px] w-full opacity-0 transition-opacity group-hover:opacity-100",
          accentColors[stat.tone],
        )}
      />
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm",
            iconTone(stat.tone),
          )}
        >
          {Icon ? (
            <Icon className="h-6 w-6" strokeWidth={1.8} />
          ) : (
            <span className="text-2xl font-semibold leading-none">
              {stat.currencySymbol}
            </span>
          )}
        </span>
        <div className="min-w-0">
          <p className={eyebrow}>{stat.label}</p>
          <p className={cn("mt-1 text-3xl font-bold", strong)}>{stat.value}</p>
          <p className={cn("mt-1 text-xs font-semibold", muted)}>
            {stat.delta}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboardPage({ user }: { user: AuthUser }) {
  const [activeTab, setActiveTab] = useState<
    "all" | "messages" | "campaigns" | "leads"
  >("all");
  const [timeRange, setTimeRange] =
    useState<DashboardTimeRange>("current-week");
  const [isRefreshingConnection, setIsRefreshingConnection] = useState(false);
  const connectionSyncAttemptedRef = useRef(false);
  const greeting = getTimeBasedGreeting();
  const dashboardQuery = useQuery(getDashboardSummary, { timeRange });
  const workspaceQuery = useQuery(getWhatsAppWorkspaceState);
  const { data, isLoading } = dashboardQuery;
  const summary = data as DashboardSummary | undefined;
  const workspace = workspaceQuery.data as WhatsAppWorkspaceState | undefined;
  const timeRangeLabel =
    dashboardTimeRangeOptions.find((option) => option.value === timeRange)
      ?.helper ?? "This week";
  const staffDisplayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    (summary?.staffDisplayName &&
    !["Team Member", "Workspace Admin"].includes(summary.staffDisplayName)
      ? summary.staffDisplayName
      : "");
  const currency = summary?.currency ?? { code: "NGN", symbol: "₦" };
  const revenueFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.code,
    maximumFractionDigits: 0,
  });
  const statsData: DashboardStat[] = [
    {
      label: "Messages Received",
      value: (summary?.messagesReceived ?? 0).toLocaleString(),
      delta: `${timeRangeLabel} messages`,
      icon: MessageSquare,
      tone: "green",
    },
    {
      label: "Leads Captured",
      value: (summary?.leadsCaptured ?? 0).toLocaleString(),
      delta: `${timeRangeLabel} leads`,
      icon: UserPlus,
      tone: "indigo",
    },
    {
      label: "AI Responses",
      value: (summary?.aiResponses ?? 0).toLocaleString(),
      delta: `${timeRangeLabel} replies`,
      icon: Bot,
      tone: "blue",
    },
    {
      label: "Revenue in Pipeline",
      value: revenueFormatter.format(summary?.revenueInPipeline ?? 0),
      delta: `${timeRangeLabel} pipeline`,
      currencySymbol: currency.symbol,
      tone: "amber",
    },
  ];
  const activityItemsData =
    summary?.recentActivities.map((item) => ({
      ...item,
      icon:
        item.badge === "LEAD"
          ? UserPlus
          : item.badge === "AI"
            ? Bot
            : item.badge === "CAMPAIGN"
              ? Send
              : item.badge === "QR"
                ? QrCode
                : MessageSquare,
      tone:
        item.badge === "LEAD"
          ? "green"
          : item.badge === "AI"
            ? "purple"
            : item.badge === "CAMPAIGN"
              ? "blue"
              : item.badge === "QR"
                ? "slate"
                : "green",
    })) ?? [];
  const conversationsData =
    summary?.recentConversations.map((conversation, index) => ({
      ...conversation,
      tone: [
        "bg-gradient-to-br from-indigo-500 to-purple-500",
        "bg-gradient-to-br from-blue-500 to-indigo-500",
        "bg-gradient-to-br from-amber-500 to-red-500",
        "bg-gradient-to-br from-emerald-500 to-blue-500",
        "bg-gradient-to-br from-purple-500 to-pink-500",
      ][index % 5],
    })) ?? [];
  const lastCampaign = summary?.lastCampaign ?? null;
  const isQrConnected = workspace?.qr.connected ?? summary?.qrConnected ?? false;
  const apiStatus = workspace?.api.status ?? summary?.apiStatus ?? "none";
  const qrDisconnectReason = workspace?.qr.disconnectReason ?? null;
  const qrLastError = workspace?.qr.lastError ?? null;
  const showQrRecoveryBanner =
    !isQrConnected &&
    (qrDisconnectReason === "linked_device_lost" ||
      qrDisconnectReason === "provider_error" ||
      qrDisconnectReason === "qr_expired");

  async function handleConnectionRefresh() {
    setIsRefreshingConnection(true);
    try {
      await refreshWhatsAppQrStatus({});
      await dashboardQuery.refetch();
      await workspaceQuery.refetch();
    } finally {
      setIsRefreshingConnection(false);
    }
  }

  useEffect(() => {
    if (
      isLoading ||
      isQrConnected ||
      connectionSyncAttemptedRef.current
    ) {
      return;
    }

    connectionSyncAttemptedRef.current = true;
    void handleConnectionRefresh().catch(() => undefined);
  }, [isLoading, isQrConnected]);

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-5">
        {/* Welcome Area */}
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className={cn("text-2xl font-bold", strong)}>Dashboard</h1>
            <p className={cn("mt-1 text-sm", muted)}>
              {greeting}{staffDisplayName ? `, ${staffDisplayName}` : ""} 👋
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 cursor-pointer rounded-full border border-[#e8e2d8] bg-white px-3 text-xs font-bold text-slate-700 outline-none transition-colors hover:bg-[#fff8ee] focus:border-[#fe901d]/40 dark:border-white/10 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-white/5"
              value={timeRange}
              onChange={(event) =>
                setTimeRange(event.target.value as DashboardTimeRange)
              }
              aria-label="Dashboard timeline"
            >
              {dashboardTimeRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <DashboardPill tone="green">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isQrConnected
                    ? "animate-pulse bg-emerald-500"
                    : "bg-slate-400",
                )}
              />
              {isQrConnected ? "QR Connected" : "QR Not Connected"}
            </DashboardPill>
            <DashboardPill tone="warning">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.8} />
              Limited Plan
            </DashboardPill>
            <Button
              asChild
              className={cn(
                "h-10 cursor-pointer rounded-full px-4 text-sm font-bold gap-1.5",
                orangeButton,
              )}
            >
              <Link to="/whatsapp/setup">
                <Rocket className="h-4 w-4" strokeWidth={1.8} />
                Upgrade to API
              </Link>
            </Button>
          </div>
        </section>

        {showQrRecoveryBanner && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-500/30 dark:bg-red-500/10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-300">
                <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-red-800 dark:text-red-200">
                  {qrDisconnectReason === "qr_expired"
                    ? "The last WhatsApp QR expired"
                    : qrDisconnectReason === "linked_device_lost"
                      ? "WhatsApp lost the linked-device session"
                      : "WhatsApp QR needs recovery"}
                </p>
                <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                  {qrLastError ??
                    "Start a fresh QR to restore the workspace connection while Official API migration is pending."}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 cursor-pointer rounded-lg px-3 text-xs font-bold",
                    "border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-500/10",
                  )}
                  onClick={handleConnectionRefresh}
                  disabled={isRefreshingConnection}
                >
                  {isRefreshingConnection ? "Checking..." : "Refresh status"}
                </Button>
                <Button
                  asChild
                  className={cn(
                    "h-9 cursor-pointer rounded-lg px-3 text-xs font-bold gap-1.5",
                    orangeButton,
                  )}
                >
                  <Link to="/whatsapp">
                    <QrCode className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Start fresh QR
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Connectivity Status Bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e8e2d8] bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-[#0d1524] md:flex-nowrap md:gap-0 md:px-6">
          {/* Item 1: QR Status */}
          <div className="flex items-center gap-3 flex-1 min-w-[180px]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
              {isQrConnected ? (
                <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} />
              ) : (
                <QrCode className="h-5 w-5" strokeWidth={1.8} />
              )}
            </span>
            <div className="min-w-0">
              <p className={cn("text-sm font-bold", strong)}>
                {isQrConnected ? "QR Connected" : "QR Not Connected"}
              </p>
              <p className={cn("text-xs", muted)}>
                {isQrConnected
                  ? "WhatsApp is connected"
                  : qrDisconnectReason === "linked_device_lost"
                    ? "Linked-device session expired"
                    : qrDisconnectReason === "qr_expired"
                      ? "QR expired before linking"
                      : "Connect WhatsApp to start"}
              </p>
            </div>
            <Button
              variant="outline"
              className={cn(
                "h-8 cursor-pointer rounded-lg px-3 text-xs font-semibold ml-auto",
                subtleButton,
              )}
              onClick={handleConnectionRefresh}
              disabled={isRefreshingConnection}
            >
              {isRefreshingConnection
                ? "Checking..."
                : isQrConnected
                  ? "Refresh"
                  : "Reconnect"}
            </Button>
          </div>

          <div className="hidden md:block w-px h-8 bg-[#e8e2d8] dark:bg-white/10" />

          {/* Item 2: API Status */}
          <div className="flex items-center gap-3 flex-1 min-w-[180px] md:px-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300">
              <Wifi className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className={cn("text-sm font-bold", strong)}>
                API:{" "}
                {apiStatus === "approved"
                  ? "Active"
                  : apiStatus === "pending"
                    ? "Pending"
                    : "Not Setup"}
              </p>
              <p className={cn("text-xs", muted)}>
                Unlock higher limits ·{" "}
                <Link
                  to="/whatsapp/setup"
                  className="cursor-pointer font-semibold text-[#fe901d] hover:underline"
                >
                  Set up now →
                </Link>
              </p>
            </div>
          </div>

          <div className="hidden md:block w-px h-8 bg-[#e8e2d8] dark:bg-white/10" />

          {/* Item 3: Limited Mode */}
          <div className="flex items-center gap-3 flex-1 min-w-[180px] md:px-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff7e8] text-[#fe901d] dark:bg-[#fe901d]/15 dark:text-[#ffb84d]">
              <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className={cn("text-sm font-bold", strong)}>
                {apiStatus === "approved"
                  ? "API mode available"
                  : "Limited mode (QR only)"}
              </p>
              <p className={cn("text-xs", muted)}>
                {apiStatus === "approved"
                  ? "Official API is approved"
                  : "Upgrade when you need more scale"}
              </p>
            </div>
          </div>

          <div className="hidden md:block w-px h-8 bg-[#e8e2d8] dark:bg-white/10" />

          {/* Item 4: Upgrade Button */}
          <div className="w-full md:w-auto md:pl-6">
            <Button
              asChild
              className={cn(
                "h-9 cursor-pointer rounded-lg px-4 text-sm font-bold gap-1.5",
                orangeButton,
              )}
            >
              <Link to="/whatsapp/setup">
                <Rocket className="h-4 w-4" strokeWidth={1.8} />
                Upgrade to API
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </section>

        {/* Unread Messages Banner */}
        <div className="flex items-center gap-5 rounded-2xl border border-[#e8e2d8] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0d1524]">
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300 shadow-sm">
            <MessageSquare className="h-6 w-6" strokeWidth={1.8} />
            <span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {summary?.unreadMessages ?? 0}
            </span>
          </span>
          <div>
            <h2 className={cn("text-sm font-bold", strong)}>
              You have {(summary?.unreadMessages ?? 0).toLocaleString()} unread
              messages
            </h2>
            <p className={cn("text-xs", muted)}>
              Respond quickly to convert leads.
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              asChild
              className={cn(
                "h-9 cursor-pointer rounded-lg px-3 text-xs font-bold",
                orangeButton,
              )}
            >
              <Link to="/inbox">Open Inbox</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className={cn(
                "h-9 cursor-pointer rounded-lg px-3 text-xs font-bold",
                subtleButton,
              )}
            >
              <Link to="/contacts">View Leads</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className={cn(
                "h-9 cursor-pointer rounded-lg px-3 text-xs font-bold",
                subtleButton,
              )}
            >
              <Link to="/settings">Test AI</Link>
            </Button>
          </div>
        </div>

        {/* Mid Row: Activity Feed + Recommendations */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Activity Feed */}
          <div className="rounded-2xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6] dark:border-white/10">
              <h2 className={cn("text-sm font-bold", strong)}>Activity Feed</h2>
              <Link
                to="/inbox"
                className="cursor-pointer text-xs font-semibold text-[#fe901d] hover:underline"
              >
                View all
              </Link>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-5 pt-4 text-sm font-semibold border-b border-[#f3f4f6] dark:border-white/10">
              {(["all", "messages", "campaigns", "leads"] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition capitalize",
                      activeTab === tab
                        ? "bg-[#f3f4f6] text-[#182235] dark:bg-white/10 dark:text-white"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
                    )}
                  >
                    {tab === "all"
                      ? "All"
                      : tab === "messages"
                        ? "Messages"
                        : tab === "campaigns"
                          ? "Campaigns"
                          : "Leads"}
                  </button>
                ),
              )}
            </div>

            {/* Feed Items */}
            <div>
              {activityItemsData.length ? (
                activityItemsData.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 px-5 py-3 border-b border-[#f9fafb] last:border-0 hover:bg-[#fafafa] dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                          iconTone(item.tone),
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.8} />
                      </span>
                      <p className={cn("text-sm font-semibold flex-1", strong)}>
                        {item.label}
                      </p>
                      <span
                        className={cn(
                          "text-xs shrink-0 hidden sm:inline",
                          muted,
                        )}
                      >
                        {item.time}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase shrink-0",
                          badgeTone(item.tone),
                        )}
                      >
                        {item.badge}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className={cn("px-5 py-8 text-sm", muted)}>
                  {isLoading ? "Loading activity..." : "No real activity yet."}
                </div>
              )}
            </div>
          </div>

          {/* Smart Recommendations */}
          <div className="rounded-2xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f3f4f6] dark:border-white/10">
              <h2 className={cn("text-sm font-bold", strong)}>
                Smart Recommendations
              </h2>
            </div>
            <div className="flex gap-3 p-5">
              {/* Indigo Card */}
              <div className="rounded-2xl border border-[#e0d9fd] bg-[#f5f3ff] p-5 flex-1 dark:border-[#4f46e5]/20 dark:bg-[#4f46e5]/10">
                <span
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                    "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300",
                  )}
                >
                  <TrendingUp className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <h3 className={cn("mt-4 text-sm font-bold", strong)}>
                  Upgrade to API
                </h3>
                <p className={cn("mt-1 text-sm leading-5", muted)}>
                  You're reaching QR limits. API gives you 10x more capacity.
                </p>
                <Button
                  asChild
                  className={cn(
                    "mt-4 h-8 w-full cursor-pointer rounded-lg text-xs font-semibold",
                    "bg-indigo-600 text-white hover:bg-indigo-700",
                  )}
                >
                  <Link to="/whatsapp/setup">Upgrade Now</Link>
                </Button>
              </div>

              {/* Purple Card */}
              <div className="rounded-2xl border border-[#f3e0ff] bg-[#fdf4ff] p-5 flex-1 dark:border-[#a855f7]/20 dark:bg-[#a855f7]/10">
                <span
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-xl",
                    "bg-purple-500/10 text-purple-600 dark:bg-purple-400/10 dark:text-purple-300",
                  )}
                >
                  <Bot className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <h3 className={cn("mt-4 text-sm font-bold", strong)}>
                  Activate AI (Jennifer)
                </h3>
                <p className={cn("mt-1 text-sm leading-5", muted)}>
                  Let Jennifer handle common questions 24/7 automatically.
                </p>
                <Button
                  asChild
                  className={cn(
                    "mt-4 h-8 w-full cursor-pointer rounded-lg text-xs font-semibold",
                    "bg-purple-600 text-white hover:bg-purple-700",
                  )}
                >
                  <Link to="/settings">Set Up AI</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Row: Recent Conversations + Campaign Performance */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Conversations */}
          <div className="rounded-2xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6] dark:border-white/10">
              <h2 className={cn("text-sm font-bold", strong)}>
                Recent Conversations
              </h2>
              <Link
                to="/inbox"
                className="cursor-pointer text-xs font-semibold text-[#fe901d] hover:underline"
              >
                View all
              </Link>
            </div>
            <div>
              {conversationsData.length ? (
                conversationsData.map((conversation) => (
                  <div
                    key={conversation.name}
                    className="flex items-center gap-3 px-5 py-3 border-b border-[#f9fafb] last:border-0 cursor-pointer hover:bg-[#fafafa] dark:border-white/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <span
                      className={cn(
                        "h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold",
                        conversation.tone,
                      )}
                    >
                      {conversation.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={cn("truncate text-sm font-bold", strong)}>
                          {conversation.name}
                        </p>
                        {conversation.unread && (
                          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white shrink-0">
                            {conversation.unread}
                          </span>
                        )}
                      </div>
                      <p className={cn("truncate text-xs", muted)}>
                        {conversation.snippet}
                      </p>
                    </div>
                    <span
                      className={cn("text-xs shrink-0 hidden sm:inline", muted)}
                    >
                      {conversation.time}
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300 shrink-0">
                      <MessageSquare className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                  </div>
                ))
              ) : (
                <div className={cn("px-5 py-8 text-sm", muted)}>
                  {isLoading
                    ? "Loading conversations..."
                    : "No real conversations yet."}
                </div>
              )}
            </div>
          </div>

          {/* Last Campaign Performance */}
          <div className="rounded-2xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6] dark:border-white/10">
              <h2 className={cn("text-sm font-bold", strong)}>
                Last Campaign Performance
              </h2>
              <Link
                to="/campaigns"
                className="cursor-pointer text-xs font-semibold text-[#fe901d] hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className={cn("text-sm font-bold", strong)}>
                    {lastCampaign?.name ?? "No campaign yet"}
                  </p>
                  <p className={cn("text-xs", muted)}>
                    {lastCampaign
                      ? `Created ${new Date(
                          lastCampaign.createdAt,
                        ).toLocaleDateString()}`
                      : "Create a campaign to see performance here."}
                  </p>
                </div>
                <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                  {lastCampaign?.status ?? "Empty"}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-[#f9fafb] pb-4 dark:border-white/5">
                {[
                  {
                    value: lastCampaign?.sent ?? 0,
                    label: "Sent",
                    percent: "",
                  },
                  {
                    value: lastCampaign?.delivered ?? 0,
                    label: "Delivered",
                    percent:
                      lastCampaign && lastCampaign.sent > 0
                        ? `${Math.round(
                            (lastCampaign.delivered / lastCampaign.sent) * 100,
                          )}%`
                        : "",
                  },
                  {
                    value: lastCampaign?.failed ?? 0,
                    label: "Failed",
                    percent: "",
                  },
                  {
                    value:
                      lastCampaign && lastCampaign.sent > 0
                        ? lastCampaign.sent -
                          lastCampaign.delivered -
                          lastCampaign.failed
                        : 0,
                    label: "Pending",
                    percent: "",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className={cn("text-xl font-bold", strong)}>
                      {stat.value.toLocaleString()}
                    </p>
                    <p className={cn("text-[11px]", muted)}>{stat.label}</p>
                    {stat.percent && (
                      <p className={cn("text-[10px] font-bold", muted)}>
                        {stat.percent}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <Link
                to="/campaigns"
                className={cn(
                  "mt-4 flex cursor-pointer items-center justify-between transition",
                  muted,
                )}
              >
                <span className="flex items-center gap-2 text-sm font-bold hover:text-[#fe901d]">
                  <BarChart3 className="h-4 w-4" strokeWidth={1.8} />
                  View Full Campaign Report
                </span>
                <ChevronRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </UserLayout>
  );
}
