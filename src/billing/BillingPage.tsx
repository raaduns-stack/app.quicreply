import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  Download,
  MessageSquare,
  Zap,
  Layers,
  TrendingUp,
  Calendar,
} from "lucide-react";
import UserLayout from "../user/layout/UserLayout";

type Tab = "plans" | "history" | "invoices" | "usage";
type BillingCycle = "monthly" | "yearly";

interface Plan {
  id: string;
  name: string;
  price: string;
  pricePerMonth: number;
  features: string[];
  button: {
    label: string;
    variant: "disabled" | "primary" | "secondary";
  };
  highlight?: boolean;
  badge?: string;
  bgColor?: string;
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$99/mo",
    pricePerMonth: 99,
    features: ["3 Agent Seats", "QR Session Mode", "No Official Meta API"],
    button: {
      label: "CURRENT PLAN",
      variant: "disabled",
    },
  },
  {
    id: "professional",
    name: "Professional",
    price: "$499/mo",
    pricePerMonth: 499,
    features: ["10 Agent Seats", "Official Meta API", "AI Jennifer"],
    button: {
      label: "UPGRADE NOW",
      variant: "primary",
    },
    highlight: true,
    badge: "Recommended",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    pricePerMonth: 0,
    features: ["Unlimited Seats", "Infinite Messaging", "Dedicated Success Manager"],
    button: {
      label: "CONTACT SALES",
      variant: "secondary",
    },
    bgColor: "dark:bg-[#0f172a]",
  },
];

interface PaymentRecord {
  date: string;
  amount: string;
  status: "completed" | "pending" | "failed";
  method: string;
  invoiceId: string;
}

interface Invoice {
  date: string;
  amount: string;
  invoiceId: string;
}

interface UsageMetric {
  label: string;
  value: number;
  limit: number;
  unit?: string;
}

const mockPaymentHistory: PaymentRecord[] = [
  {
    date: "May 1, 2026",
    amount: "$499.00",
    status: "completed",
    method: "Visa ••••4242",
    invoiceId: "INV-2026-005",
  },
  {
    date: "Apr 1, 2026",
    amount: "$499.00",
    status: "completed",
    method: "Visa ••••4242",
    invoiceId: "INV-2026-004",
  },
  {
    date: "Mar 1, 2026",
    amount: "$499.00",
    status: "completed",
    method: "Visa ••••4242",
    invoiceId: "INV-2026-003",
  },
];

const mockInvoices: Invoice[] = [
  { date: "May 1, 2026", amount: "$499.00", invoiceId: "INV-2026-005" },
  { date: "Apr 1, 2026", amount: "$499.00", invoiceId: "INV-2026-004" },
  { date: "Mar 1, 2026", amount: "$499.00", invoiceId: "INV-2026-003" },
];

const mockUsageMetrics: UsageMetric[] = [
  { label: "Messages Sent", value: 4521, limit: 50000, unit: "messages" },
  { label: "Messages Delivered", value: 4389, limit: 50000, unit: "messages" },
  { label: "AI Responses", value: 892, limit: 10000, unit: "responses" },
  { label: "Leads Captured", value: 156, limit: 5000, unit: "leads" },
];

function ProgressBar({
  value,
  max,
  label,
  showPercentage = true,
}: {
  value: number;
  max: number;
  label: string;
  showPercentage?: boolean;
}) {
  const percentage = (value / max) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">{label}</span>
        {showPercentage && (
          <span className="text-muted-foreground text-xs">{percentage.toFixed(0)}%</span>
        )}
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#fe901d] to-[#e67e0d]"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {value.toLocaleString()} / {max.toLocaleString()}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrentPlan,
}: {
  plan: Plan;
  isCurrentPlan: boolean;
}) {
  const isEnterprise = plan.id === "enterprise";
  const baseClass = isEnterprise
    ? "bg-[#0f172a] dark:bg-[#0f172a] border border-white/10"
    : "bg-white dark:bg-[#0d1524] border border-gray-200 dark:border-white/10";

  return (
    <div className={`relative rounded-lg p-6 transition-all ${baseClass}`}>
      {plan.badge && (
        <div className="absolute top-4 left-4 inline-block bg-[#fe901d] text-white text-xs font-bold px-2.5 py-1 rounded">
          {plan.badge}
        </div>
      )}
      {plan.highlight && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#fe901d] rounded-t-lg" />
      )}

      <div className="mt-4">
        <h3 className={`text-xl font-bold ${isEnterprise ? "text-white" : "text-foreground"}`}>
          {plan.name}
        </h3>
        <div className="mt-3 flex items-baseline gap-1">
          <span className={`text-3xl font-bold ${isEnterprise ? "text-white" : "text-foreground"}`}>
            {plan.price}
          </span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-start gap-3">
            <Zap className={`h-4 w-4 mt-1 flex-shrink-0 ${isEnterprise ? "text-white" : "text-[#fe901d]"}`} />
            <span className={`text-sm ${isEnterprise ? "text-white/80" : "text-foreground"}`}>
              {feature}
            </span>
          </div>
        ))}
      </div>

      <button
        className={`mt-6 w-full py-2.5 px-4 rounded-lg font-semibold transition-all text-sm ${
          plan.button.variant === "disabled"
            ? "bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400 cursor-not-allowed"
            : plan.button.variant === "primary"
            ? "bg-[#fe901d] text-white hover:bg-[#e67e0d] active:scale-95"
            : "border border-white/30 text-white hover:bg-white/10 active:scale-95"
        }`}
        disabled={plan.button.variant === "disabled"}
      >
        {plan.button.label}
      </button>
    </div>
  );
}

function PlansTab() {
  const currentPlan = "starter";

  return (
    <div className="space-y-6">
      {/* Plan cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={currentPlan === plan.id}
          />
        ))}
      </div>

      {/* Current plan summary */}
      <div className="bg-white dark:bg-[#0d1524] border border-gray-200 dark:border-white/10 rounded-lg p-6 mt-8">
        <h3 className="text-lg font-bold text-foreground mb-4">Current Plan Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Plan</p>
            <p className="text-base font-semibold text-foreground mt-1">Starter</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Renewal Date</p>
            <p className="text-base font-semibold text-foreground mt-1">Jun 7, 2026</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Seats Used</p>
            <p className="text-base font-semibold text-foreground mt-1">3 / 3</p>
          </div>
        </div>
      </div>

      {/* Resource utilization */}
      <div className="bg-white dark:bg-[#0d1524] border border-gray-200 dark:border-white/10 rounded-lg p-6">
        <h3 className="text-lg font-bold text-foreground mb-6">Current Resource Utilization</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProgressBar
            value={3}
            max={10}
            label="Seats Used"
            showPercentage={true}
          />
          <ProgressBar
            value={1420}
            max={5000}
            label="Monthly Messages"
            showPercentage={true}
          />
        </div>
      </div>
    </div>
  );
}

function PaymentHistoryTab() {
  return (
    <div className="bg-white dark:bg-[#0d1524] border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Method</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Invoice</th>
            </tr>
          </thead>
          <tbody>
            {mockPaymentHistory.map((record, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-200 dark:border-white/10 last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/5 transition"
              >
                <td className="px-6 py-4 text-sm text-foreground">{record.date}</td>
                <td className="px-6 py-4 text-sm font-semibold text-foreground">{record.amount}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="inline-block bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-2.5 py-1 rounded text-xs font-medium capitalize">
                    {record.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-foreground">{record.method}</td>
                <td className="px-6 py-4 text-sm">
                  <button className="text-[#fe901d] hover:underline text-sm font-medium">
                    {record.invoiceId}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoicesTab() {
  return (
    <div className="space-y-3">
      {mockInvoices.map((invoice, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-[#0d1524] border border-gray-200 dark:border-white/10 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-[#fff3e1] dark:bg-[rgba(254,144,29,0.12)] flex items-center justify-center">
              <Download className="h-5 w-5 text-[#fe901d]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{invoice.invoiceId}</p>
              <p className="text-xs text-muted-foreground">{invoice.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-foreground">{invoice.amount}</span>
            <button className="px-3 py-1.5 text-sm font-medium text-[#fe901d] hover:bg-[#fff3e1] dark:hover:bg-[rgba(254,144,29,0.12)] rounded transition">
              Download
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsageTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {mockUsageMetrics.map((metric, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-[#0d1524] border border-gray-200 dark:border-white/10 rounded-lg p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {metric.value.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-[#fff3e1] dark:bg-[rgba(254,144,29,0.12)] flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-[#fe901d]" />
            </div>
          </div>
          <ProgressBar
            value={metric.value}
            max={metric.limit}
            label="Usage"
            showPercentage={true}
          />
        </div>
      ))}
    </div>
  );
}

function RightPanel() {
  return (
    <div className="w-full lg:w-[280px] space-y-6">
      {/* Current Plan Card */}
      <div className="bg-white dark:bg-[#0d1524] border border-gray-200 dark:border-white/10 rounded-lg p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Current Plan</p>
        <h3 className="text-lg font-bold text-foreground mt-2">Professional</h3>
        <p className="text-sm text-muted-foreground mt-1">$499/month</p>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Renews</span>
            <span className="text-foreground font-medium">Jun 7, 2026</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Seats</span>
            <span className="text-foreground font-medium">3 / 10</span>
          </div>
        </div>
      </div>

      {/* Usage Summary */}
      <div className="bg-white dark:bg-[#0d1524] border border-gray-200 dark:border-white/10 rounded-lg p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Usage Summary</p>
        <div className="mt-4 space-y-4">
          <ProgressBar
            value={1420}
            max={5000}
            label="Messages"
            showPercentage={false}
          />
          <ProgressBar
            value={3}
            max={10}
            label="Seats"
            showPercentage={false}
          />
          <ProgressBar
            value={892}
            max={10000}
            label="AI Credits"
            showPercentage={false}
          />
        </div>
      </div>

      {/* Upgrade CTA */}
      <div className="bg-gradient-to-br from-[#fe901d] to-[#e67e0d] rounded-lg p-5 text-white">
        <Zap className="h-5 w-5 mb-3" />
        <h3 className="font-bold text-sm mb-1">Upgrade Available</h3>
        <p className="text-xs text-orange-100 mb-4">
          Unlock unlimited seats and priority support.
        </p>
        <button className="w-full bg-white text-[#c96a00] font-semibold text-sm py-2 rounded hover:bg-orange-50 transition">
          Upgrade Now
        </button>
      </div>
    </div>
  );
}

export default function BillingPage({ user }: { user: AuthUser }) {
  const [activeTab, setActiveTab] = useState<Tab>("plans");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "plans", label: "Plans" },
    { id: "history", label: "Payment History" },
    { id: "invoices", label: "Invoices" },
    { id: "usage", label: "Usage" },
  ];

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">Billing & Plans</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage your subscription and usage
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
            {/* Monthly/Yearly toggle */}
            <div className="inline-flex bg-gray-100 dark:bg-white/10 rounded-full p-1">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  billingCycle === "monthly"
                    ? "bg-white dark:bg-white/20 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  billingCycle === "yearly"
                    ? "bg-white dark:bg-white/20 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
              </button>
            </div>
            {/* Manage button */}
            <button className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-transparent text-foreground font-semibold text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition">
              Manage Subscription
            </button>
          </div>
        </div>

        {/* Main Content + Right Panel */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-white/10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-[#fe901d] text-[#fe901d]"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "plans" && <PlansTab />}
            {activeTab === "history" && <PaymentHistoryTab />}
            {activeTab === "invoices" && <InvoicesTab />}
            {activeTab === "usage" && <UsageTab />}
          </div>

          {/* Right Panel */}
          <RightPanel />
        </div>
      </div>
    </UserLayout>
  );
}
