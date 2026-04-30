import { type ComponentType, type ReactNode } from "react";
import { Link } from "react-router";
import { type AuthUser } from "wasp/auth";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  CreditCard,
  MessageSquare,
  QrCode,
  Send,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "../client/components/ui/button";
import { Card, CardContent } from "../client/components/ui/card";
import { Progress } from "../client/components/ui/progress";
import { cn } from "../client/utils";
import UserLayout from "./layout/UserLayout";

type StatCard = {
  label: string;
  value: string;
  delta: string;
  helper: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: "orange" | "green" | "blue" | "slate";
};

type ActivityItem = {
  title: string;
  description: string;
  time: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

const shellPanelClass =
  "border-[#e6e0d6] bg-white text-[#182235] shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-[#101826] dark:text-slate-100 dark:shadow-none";
const nestedPanelClass =
  "border-[#ece8df] bg-[#fbfaf7] dark:border-white/10 dark:bg-[#0b1324]";
const subtleTextClass = "text-[#667085] dark:text-slate-400";
const strongTextClass = "text-[#182235] dark:text-slate-50";
const eyebrowClass =
  "text-[10px] font-bold uppercase tracking-[0.2em] text-[#a98755] dark:text-[#d6a75c]";
const brandButtonClass =
  "bg-[#fe901d] text-white shadow-lg shadow-[#fe901d]/20 hover:bg-[#e77f14]";
const outlineButtonClass =
  "border-[#e6e0d6] bg-white text-[#344054] hover:bg-[#fff8ee] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-200 dark:hover:bg-white/5";

const stats: StatCard[] = [
  {
    label: "Contacts",
    value: "2,847",
    delta: "+12.4%",
    helper: "New leads and customers",
    icon: Users,
    tone: "orange",
  },
  {
    label: "Messages",
    value: "18.3k",
    delta: "+8.1%",
    helper: "WhatsApp sends this week",
    icon: Send,
    tone: "green",
  },
  {
    label: "Replies",
    value: "64%",
    delta: "+2.3%",
    helper: "Inbound response rate",
    icon: TrendingUp,
    tone: "blue",
  },
  {
    label: "Jennifer",
    value: "287",
    delta: "Active",
    helper: "AI replies today",
    icon: Bot,
    tone: "slate",
  },
];

const activityItems: ActivityItem[] = [
  {
    title: "New WhatsApp lead captured",
    description: "Sarah Johnson asked about pricing and delivery.",
    time: "2 min ago",
    icon: Users,
  },
  {
    title: "Jennifer qualified a hot lead",
    description: "Budget confirmed, tagged for manual follow-up.",
    time: "42 min ago",
    icon: Bot,
  },
  {
    title: "QR session refreshed",
    description: "The mock Evolution session is still connected.",
    time: "2 hrs ago",
    icon: QrCode,
  },
  {
    title: "Campaign draft created",
    description: "Welcome offer is ready to review before sending.",
    time: "5 hrs ago",
    icon: Sparkles,
  },
];

const quickActions = [
  { label: "Connect WhatsApp", href: "/whatsapp", icon: QrCode },
  { label: "Import contacts", href: "/contacts", icon: Users },
  { label: "Create campaign", href: "/campaigns", icon: Send },
  { label: "Upgrade plan", href: "/billing", icon: CreditCard },
];

const funnelStages = [
  { label: "New", value: 42, width: "72%" },
  { label: "Qualified", value: 28, width: "55%" },
  { label: "Follow-up", value: 18, width: "38%" },
  { label: "Won", value: 9, width: "24%" },
];

function getToneClasses(tone: StatCard["tone"]) {
  if (tone === "green") {
    return "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300";
  }

  if (tone === "blue") {
    return "bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300";
  }

  if (tone === "slate") {
    return "bg-slate-500/10 text-slate-700 dark:bg-white/10 dark:text-slate-200";
  }

  return "bg-[#fff3e1] text-[#fe901d] dark:bg-[#fe901d]/15 dark:text-[#ffb84d]";
}

function StatusPill({
  children,
  tone = "orange",
}: {
  children: ReactNode;
  tone?: "orange" | "green" | "blue" | "slate";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em]",
        tone === "green"
          ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300"
          : tone === "blue"
            ? "bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300"
            : tone === "slate"
              ? "bg-[#eef2f7] text-[#475467] dark:bg-white/10 dark:text-slate-300"
              : "bg-[#fff3e1] text-[#c96a00] dark:bg-[#fe901d]/15 dark:text-[#ffb84d]",
      )}
    >
      {children}
    </span>
  );
}

function StatCardView({ stat }: { stat: StatCard }) {
  const Icon = stat.icon;

  return (
    <Card
      className={cn(
        shellPanelClass,
        "overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md dark:hover:bg-[#121d2f]",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={eyebrowClass}>{stat.label}</p>
            <p
              className={cn(
                "mt-2 text-2xl font-bold tracking-tight",
                strongTextClass,
              )}
            >
              {stat.value}
            </p>
          </div>
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl",
              getToneClasses(stat.tone),
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className={cn("text-sm", subtleTextClass)}>{stat.helper}</p>
          <span className="rounded-full bg-[#fff8ee] px-2.5 py-1 text-xs font-bold text-[#c96a00] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]">
            {stat.delta}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityIcon({ icon: Icon }: { icon: ActivityItem["icon"] }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff3e1] text-[#fe901d] dark:bg-[#fe901d]/12 dark:text-[#ffb84d]">
      <Icon className="h-4.5 w-4.5" strokeWidth={2} />
    </div>
  );
}

export default function UserDashboardPage({ user }: { user: AuthUser }) {
  const displayName = user.username || user.email?.split("@")[0] || "there";

  return (
    <UserLayout user={user}>
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-8 lg:px-10">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#e6e0d6] bg-[linear-gradient(135deg,#fffaf2_0%,#ffffff_46%,#f7fbff_100%)] p-6 shadow-sm shadow-slate-200/70 dark:border-white/10 dark:bg-[linear-gradient(135deg,#121d2e_0%,#0b1324_54%,#111827_100%)] dark:shadow-none md:p-8">
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#fe901d]/15 blur-3xl dark:bg-[#fe901d]/10" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <StatusPill>
                <Zap className="h-3.5 w-3.5" strokeWidth={2.2} />
                Revenue Sales OS
              </StatusPill>
              <h1
                className={cn(
                  "mt-5 max-w-4xl text-3xl font-bold tracking-tight md:text-4xl",
                  strongTextClass,
                )}
              >
                Welcome back, {displayName}
              </h1>
              <p
                className={cn(
                  "mt-3 max-w-2xl text-sm leading-6 md:text-base",
                  subtleTextClass,
                )}
              >
                Track WhatsApp growth, contacts, campaigns, and Jennifer's AI
                auto-replies from one focused workspace.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill tone="green">
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                  QR connected
                </StatusPill>
                <StatusPill tone="orange">
                  <Bot className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Jennifer active
                </StatusPill>
                <StatusPill tone="slate">
                  <Clock3 className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Starter plan
                </StatusPill>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className={cn(
                  "h-11 cursor-pointer rounded-2xl px-5 font-semibold",
                  brandButtonClass,
                )}
              >
                <Link to="/campaigns">
                  Create campaign
                  <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.4} />
                </Link>
              </Button>
              <Button
                asChild
                className={cn(
                  "h-11 cursor-pointer rounded-2xl px-5 font-semibold",
                  outlineButtonClass,
                )}
                variant="outline"
              >
                <Link to="/whatsapp">
                  Manage WhatsApp
                  <MessageSquare className="ml-2 h-4 w-4" strokeWidth={2.2} />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCardView key={stat.label} stat={stat} />
          ))}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <Card className={cn(shellPanelClass, "overflow-hidden")}>
            <CardContent className="p-0">
              <div className="flex flex-col gap-6 border-b border-[#ece8df] p-6 dark:border-white/10 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className={eyebrowClass}>Today's revenue engine</p>
                  <h2
                    className={cn(
                      "mt-2 text-xl font-bold tracking-tight",
                      strongTextClass,
                    )}
                  >
                    Leads moving through the pipeline
                  </h2>
                  <p className={cn("mt-1 text-sm", subtleTextClass)}>
                    Mock data for now, shaped around the QR-first WhatsApp
                    model.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#ece8df] bg-[#fff8ee] px-4 py-3 dark:border-white/10 dark:bg-[#fe901d]/10">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#c96a00] dark:text-[#ffb84d]">
                    64% ready
                  </p>
                  <Progress className="mt-2 h-2 w-36 bg-[#eadfce]" value={64} />
                </div>
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className={cn("rounded-3xl border p-5", nestedPanelClass)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={cn("text-sm font-bold", strongTextClass)}>
                        Funnel snapshot
                      </p>
                      <p className={cn("mt-1 text-sm", subtleTextClass)}>
                        Contacts by current sales stage
                      </p>
                    </div>
                    <StatusPill tone="green">Live QR</StatusPill>
                  </div>

                  <div className="mt-6 space-y-5">
                    {funnelStages.map((stage) => (
                      <div key={stage.label}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className={cn("font-bold", strongTextClass)}>
                            {stage.label}
                          </span>
                          <span className={subtleTextClass}>{stage.value}</span>
                        </div>
                        <div className="h-3 rounded-full bg-[#eef2f7] dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#fe901d] to-[#ffb84d]"
                            style={{ width: stage.width }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div
                    className={cn("rounded-3xl border p-5", nestedPanelClass)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={eyebrowClass}>Jennifer</p>
                        <h3
                          className={cn(
                            "mt-2 text-2xl font-bold",
                            strongTextClass,
                          )}
                        >
                          Active
                        </h3>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff3e1] text-[#fe901d] dark:bg-[#fe901d]/15 dark:text-[#ffb84d]">
                        <Bot className="h-5 w-5" strokeWidth={2.2} />
                      </div>
                    </div>
                    <p
                      className={cn("mt-3 text-sm leading-6", subtleTextClass)}
                    >
                      AI auto-reply is enabled and ready to handle qualified
                      inbound chats.
                    </p>
                  </div>

                  <div
                    className={cn("rounded-3xl border p-5", nestedPanelClass)}
                  >
                    <p className={eyebrowClass}>WhatsApp mode</p>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div>
                        <h3
                          className={cn("text-2xl font-bold", strongTextClass)}
                        >
                          QR
                        </h3>
                        <p className={cn("mt-1 text-sm", subtleTextClass)}>
                          Instant connection path
                        </p>
                      </div>
                      <StatusPill tone="green">Connected</StatusPill>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className={shellPanelClass}>
              <CardContent className="p-6">
                <p className={eyebrowClass}>Quick actions</p>
                <h2
                  className={cn(
                    "mt-2 text-xl font-bold tracking-tight",
                    strongTextClass,
                  )}
                >
                  Next best moves
                </h2>
                <div className="mt-5 grid gap-3">
                  {quickActions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <Link
                        className={cn(
                          "group flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5",
                          "border-[#ece8df] bg-[#fbfaf7] text-[#344054] hover:border-[#fe901d]/40 hover:bg-[#fff8ee]",
                          "dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-200 dark:hover:border-[#fe901d]/40 dark:hover:bg-[#fe901d]/10",
                        )}
                        key={action.label}
                        to={action.href}
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff3e1] text-[#fe901d] dark:bg-[#fe901d]/15 dark:text-[#ffb84d]">
                            <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                          </span>
                          {action.label}
                        </span>
                        <ArrowRight
                          className="h-4 w-4 text-[#fe901d] transition group-hover:translate-x-0.5"
                          strokeWidth={2.4}
                        />
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className={shellPanelClass}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={eyebrowClass}>Upgrade path</p>
                    <h2
                      className={cn(
                        "mt-2 text-xl font-bold tracking-tight",
                        strongTextClass,
                      )}
                    >
                      Official API
                    </h2>
                  </div>
                  <StatusPill tone="blue">Not setup</StatusPill>
                </div>
                <p className={cn("mt-3 text-sm leading-6", subtleTextClass)}>
                  Start with QR, then upgrade when campaign volume or Meta KYC
                  requirements become important.
                </p>
                <Button
                  asChild
                  className={cn(
                    "mt-5 h-11 w-full cursor-pointer rounded-2xl font-semibold",
                    brandButtonClass,
                  )}
                >
                  <Link to="/whatsapp/setup">
                    Start API setup
                    <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.4} />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <Card className={shellPanelClass}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className={eyebrowClass}>Recent activity</p>
                  <h2
                    className={cn(
                      "mt-2 text-xl font-bold tracking-tight",
                      strongTextClass,
                    )}
                  >
                    Workspace pulse
                  </h2>
                </div>
                <Button
                  asChild
                  className={cn(
                    "cursor-pointer rounded-2xl",
                    outlineButtonClass,
                  )}
                  size="sm"
                  variant="outline"
                >
                  <Link to="/contacts">
                    View contacts
                    <ArrowRight
                      className="ml-1.5 h-3.5 w-3.5"
                      strokeWidth={2.4}
                    />
                  </Link>
                </Button>
              </div>

              <div className="mt-5 divide-y divide-[#ece8df] dark:divide-white/10">
                {activityItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
                      key={`${item.title}-${item.time}`}
                    >
                      <ActivityIcon icon={Icon} />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            strongTextClass,
                          )}
                        >
                          {item.title}
                        </p>
                        <p className={cn("mt-1 text-sm", subtleTextClass)}>
                          {item.description}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-xs font-semibold",
                          subtleTextClass,
                        )}
                      >
                        {item.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className={shellPanelClass}>
            <CardContent className="p-6">
              <p className={eyebrowClass}>Broadcast readiness</p>
              <h2
                className={cn(
                  "mt-2 text-xl font-bold tracking-tight",
                  strongTextClass,
                )}
              >
                Campaign limits
              </h2>
              <p className={cn("mt-2 text-sm leading-6", subtleTextClass)}>
                QR mode is perfect for instant replies. Bulk sending should
                guide users toward Official API.
              </p>

              <div className="mt-5 space-y-3">
                <div className={cn("rounded-2xl border p-4", nestedPanelClass)}>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-bold", strongTextClass)}>
                      QR daily send estimate
                    </span>
                    <span className="text-sm font-bold text-[#fe901d]">
                      43%
                    </span>
                  </div>
                  <Progress
                    className="mt-3 h-2 bg-[#eadfce] dark:bg-white/10"
                    value={43}
                  />
                </div>
                <div className={cn("rounded-2xl border p-4", nestedPanelClass)}>
                  <p className={cn("text-sm font-bold", strongTextClass)}>
                    Recommended next step
                  </p>
                  <p className={cn("mt-1 text-sm", subtleTextClass)}>
                    Keep QR active, prepare API setup when campaigns launch.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </UserLayout>
  );
}
