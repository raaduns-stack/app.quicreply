import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock,
  Megaphone,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import UserLayout from "./layout/UserLayout";
import { Card, CardContent } from "../client/components/ui/card";
import { Button } from "../client/components/ui/button";
import { Progress } from "../client/components/ui/progress";
import { cn } from "../client/utils";

type StatCard = {
  label: string;
  value: string;
  delta: string;
  deltaTone: "up" | "down" | "flat";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: string;
};

const stats: StatCard[] = [
  {
    label: "Total Contacts",
    value: "2,847",
    delta: "+12.4% vs last week",
    deltaTone: "up",
    icon: Users,
    accent: "from-blue-500/15 to-blue-500/5 text-blue-600",
  },
  {
    label: "Campaigns Sent",
    value: "24",
    delta: "+3 this week",
    deltaTone: "up",
    icon: Megaphone,
    accent: "from-purple-500/15 to-purple-500/5 text-purple-600",
  },
  {
    label: "Messages Sent",
    value: "18,392",
    delta: "+8.1% vs last week",
    deltaTone: "up",
    icon: MessageSquare,
    accent: "from-primary/15 to-primary/5 text-primary",
  },
  {
    label: "Response Rate",
    value: "64%",
    delta: "+2.3% vs last week",
    deltaTone: "up",
    icon: TrendingUp,
    accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-600",
  },
];

type ActivityItem = {
  type: "lead" | "campaign" | "system";
  title: string;
  description: string;
  time: string;
};

const recentActivity: ActivityItem[] = [
  {
    type: "lead",
    title: "New lead captured",
    description: "Sarah Johnson asked about the Growth plan via WhatsApp.",
    time: "2 min ago",
  },
  {
    type: "campaign",
    title: "Campaign delivered",
    description: "\"April promo blast\" sent to 1,284 contacts. 847 opened.",
    time: "18 min ago",
  },
  {
    type: "lead",
    title: "AI qualified a lead",
    description: "Mike R. tagged as hot — ready to buy, budget confirmed.",
    time: "42 min ago",
  },
  {
    type: "system",
    title: "QR connection refreshed",
    description: "Your WhatsApp session was renewed automatically.",
    time: "2 hours ago",
  },
  {
    type: "campaign",
    title: "Scheduled campaign queued",
    description: "\"Welcome flow\" will run tomorrow at 9:00 AM.",
    time: "5 hours ago",
  },
];

const quickActions = [
  { label: "Launch a campaign", href: "/campaigns", icon: Megaphone },
  { label: "Import contacts", href: "/contacts", icon: Users },
  { label: "Train AI replies", href: "/settings", icon: Bot },
  { label: "Upgrade plan", href: "/billing", icon: Sparkles },
];

function StatCardView({ stat }: { stat: StatCard }) {
  const Icon = stat.icon;
  const toneClass =
    stat.deltaTone === "up"
      ? "text-emerald-600"
      : stat.deltaTone === "down"
      ? "text-red-500"
      : "text-muted-foreground";
  return (
    <Card className="overflow-hidden border-border/60 bg-card transition hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-black tracking-tight text-foreground">
              {stat.value}
            </p>
            <p className={cn("mt-2 flex items-center gap-1 text-xs font-medium", toneClass)}>
              {stat.deltaTone === "up" ? (
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.4} />
              ) : null}
              {stat.delta}
            </p>
          </div>
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br",
              stat.accent,
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  if (type === "lead") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
        <Users className="h-4 w-4" strokeWidth={2} />
      </div>
    );
  }
  if (type === "campaign") {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/10 text-purple-600">
        <Megaphone className="h-4 w-4" strokeWidth={2} />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Zap className="h-4 w-4" strokeWidth={2} />
    </div>
  );
}

export default function UserDashboardPage({ user }: { user: AuthUser }) {
  // Mock flags — will come from getWorkspaceFlags query eventually
  const flags = {
    plan: "starter" as "starter" | "growth" | "pro",
    whatsappMode: "qr" as "qr" | "api",
    apiStatus: "none" as "none" | "pending" | "approved",
    kycStatus: "pending" as "pending" | "submitted" | "verified",
    qrConnected: true,
  };

  const displayName = user.username || user.email?.split("@")[0] || "there";
  const isApiMode = flags.whatsappMode === "api";

  return (
    <UserLayout user={user}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Welcome back
            </p>
            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
              Hi, {displayName} 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Here's what's happening with your workspace today.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/campaigns">
              <Megaphone className="mr-2 h-4 w-4" />
              Launch campaign
            </Link>
          </Button>
        </div>

        {/* Upgrade banner — only for starter plan */}
        {flags.plan === "starter" ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Sparkles className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    You're on the Starter plan
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Unlock broadcast campaigns, AI automation, and the Official WhatsApp API.
                  </p>
                </div>
              </div>
              <Button asChild>
                <Link to="/billing">
                  Upgrade now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : null}

        {/* Stat cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCardView key={stat.label} stat={stat} />
          ))}
        </div>

        {/* Main grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* WhatsApp status card */}
          <Card className="lg:col-span-2 border-border/60">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <MessageSquare className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      WhatsApp Connection
                    </p>
                    <h3 className="mt-1 text-xl font-black tracking-tight text-foreground">
                      {isApiMode ? "Official API" : "QR Mode"}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {isApiMode ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                          <ShieldCheck className="h-3 w-3" />
                          {flags.apiStatus === "approved"
                            ? "API Active"
                            : flags.apiStatus === "pending"
                            ? "KYC Pending"
                            : "Not connected"}
                        </span>
                      ) : flags.qrConnected ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
                          <Clock className="h-3 w-3" />
                          Not connected
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        +1 555 123 4567
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Daily limit
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    1,000 msgs
                  </p>
                  <Progress className="mt-2 h-1.5" value={43} />
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Delivered today
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    432 / 1,000
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Resets at midnight
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    AI responses
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    287 today
                  </p>
                  <p className="mt-2 text-xs text-emerald-600 font-medium">
                    66% of total replies
                  </p>
                </div>
              </div>

              {!isApiMode ? (
                <div className="mt-5 flex flex-col gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Ready to scale? Upgrade to Official API
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Higher limits, verified badge, and no disconnections.
                    </p>
                  </div>
                  <Button asChild size="sm" className="shrink-0">
                    <Link to="/whatsapp/setup">
                      Upgrade to API
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="border-border/60">
            <CardContent className="p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Quick actions
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-foreground">
                Get things moving
              </h3>
              <div className="mt-4 grid gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.label}
                      to={action.href}
                      className="group flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" strokeWidth={2} />
                        {action.label}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" strokeWidth={2} />
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <Card className="mt-6 border-border/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Recent activity
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-foreground">
                  What's happening in your workspace
                </h3>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/contacts">
                  View all
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="mt-4 divide-y divide-border/60">
              {recentActivity.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <ActivityIcon type={item.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
