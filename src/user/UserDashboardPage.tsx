import { useState, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router";
import { type AuthUser } from "wasp/auth";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  MessageSquare,
  QrCode,
  Rocket,
  Send,
  TrendingUp,
  UserPlus,
  Wifi,
} from "lucide-react";
import { Button } from "../client/components/ui/button";
import { cn } from "../client/utils";
import UserLayout from "./layout/UserLayout";

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

const muted = "text-slate-500 dark:text-slate-400";
const strong = "text-[#182235] dark:text-white";
const orangeButton =
  "bg-[#fe901d] text-white shadow-lg shadow-[#fe901d]/20 hover:bg-[#e98214]";
const subtleButton =
  "border-[#e8e2d8] bg-white text-slate-700 hover:bg-[#fff8ee] dark:border-white/10 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-white/5";
const eyebrow =
  "text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400";

const statsData = [
  {
    label: "Messages Received",
    value: "256",
    delta: "+18%",
    icon: MessageSquare,
    tone: "green",
  },
  {
    label: "Leads Captured",
    value: "128",
    delta: "+22%",
    icon: UserPlus,
    tone: "indigo",
  },
  {
    label: "AI Responses",
    value: "342",
    delta: "+24%",
    icon: Bot,
    tone: "blue",
  },
  {
    label: "Revenue in Pipeline",
    value: "$8,420",
    delta: "+15%",
    icon: DollarSign,
    tone: "amber",
  },
] satisfies Array<{
  label: string;
  value: string;
  delta: string;
  icon: IconType;
  tone: "green" | "indigo" | "blue" | "amber";
}>;

const activityItemsData = [
  {
    label: "New lead captured from Facebook Ad",
    time: "12:32 PM",
    badge: "LEAD",
    icon: UserPlus,
    tone: "green",
  },
  {
    label: "AI (Jennifer) responded to customer",
    time: "12:35 PM",
    badge: "AI",
    icon: Bot,
    tone: "purple",
  },
  {
    label: 'Campaign "Weekend Promo" sent to 500 contacts',
    time: "1:02 PM",
    badge: "CAMPAIGN",
    icon: Send,
    tone: "blue",
  },
  {
    label: "WhatsApp QR code scanned and connected",
    time: "1:15 PM",
    badge: "QR",
    icon: QrCode,
    tone: "slate",
  },
  {
    label: "New deal moved to pipeline: $350",
    time: "2:10 PM",
    badge: "PIPELINE",
    icon: DollarSign,
    tone: "amber",
  },
] satisfies Array<{
  label: string;
  time: string;
  badge: string;
  icon: IconType;
  tone: "green" | "purple" | "blue" | "slate" | "amber";
}>;

const conversationsData = [
  {
    name: "Sarah Johnson",
    initials: "SJ",
    snippet: "Is the product still available?",
    time: "2m ago",
    tone: "bg-gradient-to-br from-indigo-500 to-purple-500",
    unread: "2",
  },
  {
    name: "Mike Brown",
    initials: "MB",
    snippet: "Can you share the price list?",
    time: "15m ago",
    tone: "bg-gradient-to-br from-blue-500 to-indigo-500",
  },
  {
    name: "Emily Davis",
    initials: "ED",
    snippet: "Do you deliver to my area?",
    time: "32m ago",
    tone: "bg-gradient-to-br from-amber-500 to-red-500",
  },
  {
    name: "David Wilson",
    initials: "DW",
    snippet: "I want to place a bulk order",
    time: "1h ago",
    tone: "bg-gradient-to-br from-emerald-500 to-blue-500",
  },
  {
    name: "Jessica Lee",
    initials: "JL",
    snippet: "What's the warranty on this?",
    time: "2h ago",
    tone: "bg-gradient-to-br from-purple-500 to-pink-500",
  },
];

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

function StatCard({ stat }: { stat: (typeof statsData)[number] }) {
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
      <div className={cn("absolute top-0 left-0 h-[3px] w-full opacity-0 transition-opacity group-hover:opacity-100", accentColors[stat.tone])} />
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm",
            iconTone(stat.tone),
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className={eyebrow}>{stat.label}</p>
          <p className={cn("mt-1 text-3xl font-bold", strong)}>
            {stat.value}
          </p>
          <p className="mt-1 text-xs font-semibold text-emerald-500 dark:text-emerald-400">
            ↑ {stat.delta}
          </p>
          <p className={cn("text-xs", muted)}>vs yesterday</p>
        </div>
      </div>
    </div>
  );
}

export default function UserDashboardPage({ user }: { user: AuthUser }) {
  const displayName = user.username || user.email?.split("@")[0] || "there";
  const [activeTab, setActiveTab] = useState<"all" | "messages" | "campaigns" | "leads">("all");

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-5">
        {/* Welcome Area */}
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className={cn("text-2xl font-bold", strong)}>Dashboard</h1>
            <p className={cn("mt-1 text-sm", muted)}>
              Revenue Command Center · Good morning, {displayName} 👋
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DashboardPill tone="green">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              QR Mode
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

        {/* Connectivity Status Bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e8e2d8] bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-[#0d1524] md:flex-nowrap md:gap-0 md:px-6">
          {/* Item 1: QR Connected */}
          <div className="flex items-center gap-3 flex-1 min-w-[180px]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className={cn("text-sm font-bold", strong)}>QR Connected</p>
              <p className={cn("text-xs", muted)}>WhatsApp is connected</p>
            </div>
            <Button
              variant="outline"
              className={cn("h-8 cursor-pointer rounded-lg px-3 text-xs font-semibold ml-auto", subtleButton)}
            >
              Reconnect
            </Button>
          </div>

          <div className="hidden md:block w-px h-8 bg-[#e8e2d8] dark:bg-white/10" />

          {/* Item 2: API Not Setup */}
          <div className="flex items-center gap-3 flex-1 min-w-[180px] md:px-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300">
              <Wifi className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className={cn("text-sm font-bold", strong)}>API: Not Setup</p>
              <p className={cn("text-xs", muted)}>
                Unlock higher limits ·{" "}
                <Link to="/whatsapp/setup" className="cursor-pointer font-semibold text-[#fe901d] hover:underline">
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
              <p className={cn("text-sm font-bold", strong)}>Limited mode (QR only)</p>
              <p className={cn("text-xs", muted)}>You're reaching QR limits</p>
            </div>
          </div>

          <div className="hidden md:block w-px h-8 bg-[#e8e2d8] dark:bg-white/10" />

          {/* Item 4: Upgrade Button */}
          <div className="w-full md:w-auto md:pl-6">
            <Button
              asChild
              className={cn("h-9 cursor-pointer rounded-lg px-4 text-sm font-bold gap-1.5", orangeButton)}
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
              8
            </span>
          </span>
          <div>
            <h2 className={cn("text-sm font-bold", strong)}>
              You have 8 unread messages
            </h2>
            <p className={cn("text-xs", muted)}>
              Respond quickly to convert leads...
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              asChild
              className={cn("h-9 cursor-pointer rounded-lg px-3 text-xs font-bold", orangeButton)}
            >
              <Link to="/inbox">Open Inbox</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className={cn("h-9 cursor-pointer rounded-lg px-3 text-xs font-bold", subtleButton)}
            >
              <Link to="/contacts">View Leads</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className={cn("h-9 cursor-pointer rounded-lg px-3 text-xs font-bold", subtleButton)}
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
              <Link to="/inbox" className="cursor-pointer text-xs font-semibold text-[#fe901d] hover:underline">
                View all
              </Link>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 px-5 pt-4 text-sm font-semibold border-b border-[#f3f4f6] dark:border-white/10">
              {(["all", "messages", "campaigns", "leads"] as const).map((tab) => (
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
                  {tab === "all" ? "All" : tab === "messages" ? "Messages" : tab === "campaigns" ? "Campaigns" : "Leads"}
                </button>
              ))}
            </div>

            {/* Feed Items */}
            <div>
              {activityItemsData.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 px-5 py-3 border-b border-[#f9fafb] last:border-0 hover:bg-[#fafafa] dark:border-white/5 dark:hover:bg-white/5"
                  >
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-full shrink-0", iconTone(item.tone))}>
                      <Icon className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                    <p className={cn("text-sm font-semibold flex-1", strong)}>
                      {item.label}
                    </p>
                    <span className={cn("text-xs shrink-0 hidden sm:inline", muted)}>
                      {item.time}
                    </span>
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase shrink-0", badgeTone(item.tone))}>
                      {item.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Smart Recommendations */}
          <div className="rounded-2xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f3f4f6] dark:border-white/10">
              <h2 className={cn("text-sm font-bold", strong)}>Smart Recommendations</h2>
            </div>
            <div className="flex gap-3 p-5">
              {/* Indigo Card */}
              <div className="rounded-2xl border border-[#e0d9fd] bg-[#f5f3ff] p-5 flex-1 dark:border-[#4f46e5]/20 dark:bg-[#4f46e5]/10">
                <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-300")}>
                  <TrendingUp className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <h3 className={cn("mt-4 text-sm font-bold", strong)}>Upgrade to API</h3>
                <p className={cn("mt-1 text-sm leading-5", muted)}>You're reaching QR limits. API gives you 10x more capacity.</p>
                <Button
                  asChild
                  className={cn("mt-4 h-8 w-full cursor-pointer rounded-lg text-xs font-semibold", "bg-indigo-600 text-white hover:bg-indigo-700")}
                >
                  <Link to="/whatsapp/setup">Upgrade Now</Link>
                </Button>
              </div>

              {/* Purple Card */}
              <div className="rounded-2xl border border-[#f3e0ff] bg-[#fdf4ff] p-5 flex-1 dark:border-[#a855f7]/20 dark:bg-[#a855f7]/10">
                <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", "bg-purple-500/10 text-purple-600 dark:bg-purple-400/10 dark:text-purple-300")}>
                  <Bot className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <h3 className={cn("mt-4 text-sm font-bold", strong)}>Activate AI (Jennifer)</h3>
                <p className={cn("mt-1 text-sm leading-5", muted)}>Let Jennifer handle common questions 24/7 automatically.</p>
                <Button
                  asChild
                  className={cn("mt-4 h-8 w-full cursor-pointer rounded-lg text-xs font-semibold", "bg-purple-600 text-white hover:bg-purple-700")}
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
              <h2 className={cn("text-sm font-bold", strong)}>Recent Conversations</h2>
              <Link to="/inbox" className="cursor-pointer text-xs font-semibold text-[#fe901d] hover:underline">
                View all
              </Link>
            </div>
            <div>
              {conversationsData.map((conversation) => (
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
                  <span className={cn("text-xs shrink-0 hidden sm:inline", muted)}>
                    {conversation.time}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300 shrink-0">
                    <MessageSquare className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Last Campaign Performance */}
          <div className="rounded-2xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6] dark:border-white/10">
              <h2 className={cn("text-sm font-bold", strong)}>Last Campaign Performance</h2>
              <Link to="/campaigns" className="cursor-pointer text-xs font-semibold text-[#fe901d] hover:underline">
                View all
              </Link>
            </div>
            <div className="p-5">
              <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className={cn("text-sm font-bold", strong)}>Weekend Promo</p>
                  <p className={cn("text-xs", muted)}>Sent on May 18, 2024 at 10:30 AM</p>
                </div>
                <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                  Completed
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-[#f9fafb] pb-4 dark:border-white/5">
                {[
                  { value: "500", label: "Sent", percent: "" },
                  { value: "480", label: "Delivered", percent: "96%" },
                  { value: "120", label: "Clicked", percent: "24%" },
                  { value: "45", label: "Replies", percent: "9%" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p className={cn("text-xl font-bold", strong)}>{stat.value}</p>
                    <p className={cn("text-[11px]", muted)}>{stat.label}</p>
                    {stat.percent && (
                      <p className={cn("text-[10px] font-bold", muted)}>{stat.percent}</p>
                    )}
                  </div>
                ))}
              </div>

              <Link
                to="/campaigns"
                className={cn("mt-4 flex cursor-pointer items-center justify-between transition", muted)}
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
