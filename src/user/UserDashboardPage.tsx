import { type ComponentType, type ReactNode } from "react";
import { Link } from "react-router";
import { type AuthUser } from "wasp/auth";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  DollarSign,
  MessageSquare,
  QrCode,
  Rocket,
  Send,
  Sparkles,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { Button } from "../client/components/ui/button";
import { Card, CardContent } from "../client/components/ui/card";
import { cn } from "../client/utils";
import UserLayout from "./layout/UserLayout";

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

const surface =
  "border-[#e7e1d8] bg-white text-[#172033] shadow-sm shadow-slate-200/70 dark:border-white/10 dark:bg-[#0d1524] dark:text-slate-100 dark:shadow-none";
const muted = "text-slate-500 dark:text-slate-400";
const strong = "text-[#172033] dark:text-slate-50";
const orangeButton =
  "bg-[#fe901d] text-white shadow-lg shadow-[#fe901d]/20 hover:bg-[#e98214]";
const subtleButton =
  "border-[#e7e1d8] bg-white text-slate-700 hover:bg-[#fff8ee] dark:border-white/10 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-white/5";
const eyebrow =
  "text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500";

const stats = [
  {
    label: "Messages Received",
    value: "256",
    delta: "18% vs yesterday",
    icon: MessageSquare,
    tone: "green",
  },
  {
    label: "Leads Captured",
    value: "128",
    delta: "22% vs yesterday",
    icon: UserPlus,
    tone: "indigo",
  },
  {
    label: "AI Responses",
    value: "342",
    delta: "24% vs yesterday",
    icon: Bot,
    tone: "blue",
  },
  {
    label: "Revenue in Pipeline",
    value: "$8,420",
    delta: "15% vs yesterday",
    icon: DollarSign,
    tone: "orange",
  },
] satisfies Array<{
  label: string;
  value: string;
  delta: string;
  icon: IconType;
  tone: "green" | "indigo" | "blue" | "orange";
}>;

const activityItems = [
  {
    label: "New lead captured from Facebook Ad",
    time: "12:32 PM",
    badge: "Lead",
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
    badge: "Campaign",
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
    badge: "Pipeline",
    icon: DollarSign,
    tone: "orange",
  },
] satisfies Array<{
  label: string;
  time: string;
  badge: string;
  icon: IconType;
  tone: "green" | "purple" | "blue" | "slate" | "orange";
}>;

const conversations = [
  {
    name: "Sarah Johnson",
    initials: "SJ",
    snippet: "Is the product still available?",
    time: "2m ago",
    tone: "bg-violet-500",
    unread: "2",
  },
  {
    name: "Mike Brown",
    initials: "MB",
    snippet: "Can you share the price list?",
    time: "15m ago",
    tone: "bg-blue-500",
  },
  {
    name: "Emily Davis",
    initials: "ED",
    snippet: "Do you deliver to my area?",
    time: "32m ago",
    tone: "bg-orange-500",
  },
  {
    name: "David Wilson",
    initials: "DW",
    snippet: "I want to place a bulk order",
    time: "1h ago",
    tone: "bg-cyan-600",
  },
  {
    name: "Jessica Lee",
    initials: "JL",
    snippet: "What's the warranty on this?",
    time: "2h ago",
    tone: "bg-fuchsia-500",
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

function StatCard({ stat }: { stat: (typeof stats)[number] }) {
  const Icon = stat.icon;

  return (
    <Card className={surface}>
      <CardContent className="flex items-center gap-4 p-5">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            iconTone(stat.tone),
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className={eyebrow}>{stat.label}</p>
          <p className={cn("mt-1 text-2xl font-bold tracking-tight", strong)}>
            {stat.value}
          </p>
          <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
            ↑ {stat.delta}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationCard({
  icon: Icon,
  title,
  body,
  cta,
  href,
  tone,
}: {
  icon: IconType;
  title: string;
  body: string;
  cta: string;
  href: string;
  tone: "blue" | "purple";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        tone === "blue"
          ? "border-blue-200 bg-blue-50/70 dark:border-blue-400/20 dark:bg-blue-400/10"
          : "border-purple-200 bg-purple-50/70 dark:border-purple-400/20 dark:bg-purple-400/10",
      )}
    >
      <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", iconTone(tone))}>
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <h3 className={cn("mt-4 text-sm font-bold", strong)}>{title}</h3>
      <p className={cn("mt-1 min-h-12 text-sm leading-5", muted)}>{body}</p>
      <Button
        asChild
        className={cn(
          "mt-4 h-9 w-full cursor-pointer rounded-lg text-sm font-semibold",
          orangeButton,
        )}
      >
        <Link to={href}>
          {cta}
          <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2} />
        </Link>
      </Button>
    </div>
  );
}

export default function UserDashboardPage({ user }: { user: AuthUser }) {
  const displayName = user.username || user.email?.split("@")[0] || "there";

  return (
    <UserLayout user={user}>
      <div className="mx-auto w-full max-w-[1380px] space-y-5 px-4 py-6 md:px-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className={cn("text-2xl font-bold tracking-tight", strong)}>
              Dashboard
            </h1>
            <p className={cn("mt-1 text-sm", muted)}>
              Revenue Command Center · Good morning, {displayName} 👋
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DashboardPill tone="green">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              QR Mode
            </DashboardPill>
            <DashboardPill tone="warning">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.8} />
              Limited Plan
            </DashboardPill>
            <Button
              asChild
              className={cn(
                "h-10 cursor-pointer rounded-xl px-4 text-sm font-bold",
                orangeButton,
              )}
            >
              <Link to="/whatsapp/setup">
                Upgrade to API
                <Rocket className="ml-2 h-4 w-4" strokeWidth={1.8} />
              </Link>
            </Button>
          </div>
        </section>

        <Card className={surface}>
          <CardContent className="grid gap-4 p-4 lg:grid-cols-[1.25fr_1.25fr_1.35fr_auto] lg:items-center">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <div>
                <p className={cn("text-sm font-bold", strong)}>QR Connected</p>
                <p className={cn("text-sm", muted)}>WhatsApp is connected</p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-[#eee7de] pt-4 dark:border-white/10 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300">
                <QrCode className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <div>
                <p className={cn("text-sm font-bold", strong)}>
                  API: Not Setup
                </p>
                <p className={cn("text-sm", muted)}>
                  Unlock higher limits{" "}
                  <Link
                    className="cursor-pointer font-bold text-[#fe901d] hover:underline"
                    to="/whatsapp/setup"
                  >
                    Set up now →
                  </Link>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-[#eee7de] pt-4 dark:border-white/10 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff7e8] text-[#fe901d] dark:bg-[#fe901d]/15 dark:text-[#ffb84d]">
                <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <div>
                <p className={cn("text-sm font-bold", strong)}>
                  Limited mode (QR only)
                </p>
                <p className={cn("text-sm", muted)}>
                  You&apos;re reaching QR limits
                </p>
              </div>
            </div>

            <Button
              asChild
              className={cn(
                "h-10 cursor-pointer rounded-xl px-4 text-sm font-bold",
                orangeButton,
              )}
            >
              <Link to="/whatsapp/setup">
                Upgrade to API
                <Rocket className="ml-2 h-4 w-4" strokeWidth={1.8} />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </section>

        <Card className={surface}>
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                <MessageSquare className="h-6 w-6" strokeWidth={1.8} />
                <span className="absolute -right-2 -top-2 rounded-full bg-[#fe901d] px-1.5 py-0.5 text-[10px] font-bold text-white">
                  8
                </span>
              </span>
              <div>
                <h2 className={cn("text-base font-bold", strong)}>
                  You have 8 unread messages
                </h2>
                <p className={cn("mt-1 text-sm", muted)}>
                  Respond quickly to convert leads and close more deals.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                className={cn(
                  "h-10 cursor-pointer rounded-xl px-4 text-sm font-bold",
                  orangeButton,
                )}
              >
                <Link to="/whatsapp">
                  <MessageSquare className="mr-2 h-4 w-4" strokeWidth={1.8} />
                  Open Inbox
                </Link>
              </Button>
              <Button
                asChild
                className={cn(
                  "h-10 cursor-pointer rounded-xl px-4 text-sm font-bold",
                  subtleButton,
                )}
                variant="outline"
              >
                <Link to="/contacts">
                  <UserPlus className="mr-2 h-4 w-4" strokeWidth={1.8} />
                  View Leads
                </Link>
              </Button>
              <Button
                asChild
                className={cn(
                  "h-10 cursor-pointer rounded-xl px-4 text-sm font-bold",
                  subtleButton,
                )}
                variant="outline"
              >
                <Link to="/settings">
                  <Sparkles className="mr-2 h-4 w-4" strokeWidth={1.8} />
                  Test AI
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
          <Card className={surface}>
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-[#eee7de] p-5 dark:border-white/10">
                <h2 className={cn("text-base font-bold", strong)}>
                  Activity Feed
                </h2>
                <Link
                  className="cursor-pointer text-sm font-bold text-[#fe901d] hover:underline"
                  to="/whatsapp"
                >
                  View all
                </Link>
              </div>
              <div className="flex gap-2 px-5 pt-4 text-sm font-semibold">
                {["All", "Messages", "Campaigns", "Leads"].map((tab, index) => (
                  <button
                    className={cn(
                      "cursor-pointer rounded-lg px-3 py-2 text-sm transition",
                      index === 0
                        ? "bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-50"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
                    )}
                    key={tab}
                    type="button"
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="divide-y divide-[#f0ebe4] px-5 dark:divide-white/10">
                {activityItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-4"
                      key={item.label}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full",
                          iconTone(item.tone),
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
                      </span>
                      <p className={cn("text-sm font-semibold", strong)}>
                        {item.label}
                      </p>
                      <span className={cn("hidden text-sm sm:inline", muted)}>
                        {item.time}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase",
                          badgeTone(item.tone),
                        )}
                      >
                        {item.badge}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className={surface}>
            <CardContent className="p-0">
              <div className="border-b border-[#eee7de] p-5 dark:border-white/10">
                <h2 className={cn("text-base font-bold", strong)}>
                  Smart Recommendations
                </h2>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-2">
                <RecommendationCard
                  body="You're reaching QR limits. API gives you 10x more capacity and stability."
                  cta="Upgrade Now"
                  href="/whatsapp/setup"
                  icon={TrendingUp}
                  title="Upgrade to API"
                  tone="blue"
                />
                <RecommendationCard
                  body="Let Jennifer handle common questions and qualify leads 24/7 automatically."
                  cta="Set Up AI"
                  href="/settings"
                  icon={Bot}
                  title="Activate AI (Jennifer)"
                  tone="purple"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
          <Card className={surface}>
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-[#eee7de] p-5 dark:border-white/10">
                <h2 className={cn("text-base font-bold", strong)}>
                  Recent Conversations
                </h2>
                <Link
                  className="cursor-pointer text-sm font-bold text-[#fe901d] hover:underline"
                  to="/whatsapp"
                >
                  View all
                </Link>
              </div>
              <div className="divide-y divide-[#f0ebe4] px-5 dark:divide-white/10">
                {conversations.map((conversation) => (
                  <div
                    className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 py-3"
                    key={conversation.name}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white",
                        conversation.tone,
                      )}
                    >
                      {conversation.initials}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("truncate text-sm font-bold", strong)}>
                          {conversation.name}
                        </p>
                        {conversation.unread ? (
                          <span className="rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                            {conversation.unread}
                          </span>
                        ) : null}
                      </div>
                      <p className={cn("truncate text-sm", muted)}>
                        {conversation.snippet}
                      </p>
                    </div>
                    <span className={cn("hidden text-sm sm:inline", muted)}>
                      {conversation.time}
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                      <MessageSquare className="h-4 w-4" strokeWidth={1.8} />
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={surface}>
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-[#eee7de] p-5 dark:border-white/10">
                <h2 className={cn("text-base font-bold", strong)}>
                  Last Campaign Performance
                </h2>
                <Link
                  className="cursor-pointer text-sm font-bold text-[#fe901d] hover:underline"
                  to="/campaigns"
                >
                  View all
                </Link>
              </div>
              <div className="p-5">
                <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className={cn("text-sm font-bold", strong)}>
                      Weekend Promo
                    </p>
                    <p className={cn("text-sm", muted)}>
                      Sent on May 18, 2024 at 10:30 AM
                    </p>
                  </div>
                  <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                    Completed
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                  {[
                    ["500", "Sent", ""],
                    ["480", "Delivered", "96%"],
                    ["120", "Clicked", "24%"],
                    ["45", "Replies", "9%"],
                  ].map(([value, label, sub]) => (
                    <div
                      className="border-r border-[#eee7de] last:border-r-0 dark:border-white/10"
                      key={label}
                    >
                      <p className={cn("text-2xl font-bold", strong)}>
                        {value}
                      </p>
                      <p className={cn("text-xs", muted)}>{label}</p>
                      {sub ? (
                        <p className={cn("text-xs font-bold", muted)}>{sub}</p>
                      ) : null}
                    </div>
                  ))}
                </div>

                <Link
                  className={cn(
                    "mt-5 flex cursor-pointer items-center justify-between border-t border-[#eee7de] pt-4 text-sm font-bold transition hover:text-[#fe901d] dark:border-white/10",
                    muted,
                  )}
                  to="/campaigns"
                >
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" strokeWidth={1.8} />
                    View Full Campaign Report
                  </span>
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </UserLayout>
  );
}
