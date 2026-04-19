import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  ArrowRight,
  Check,
  CreditCard,
  Download,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import UserLayout from "../user/layout/UserLayout";
import { Card, CardContent } from "../client/components/ui/card";
import { Button } from "../client/components/ui/button";
import { cn } from "../client/utils";
import { useToast } from "../client/hooks/use-toast";

type PlanId = "starter" | "growth" | "pro";

type Plan = {
  id: PlanId;
  name: string;
  description: string;
  priceNGN: number;
  priceLabel: string;
  billingNote: string;
  highlight: boolean;
  features: string[];
  limits: {
    contacts: string;
    campaigns: string;
    ai: string;
  };
  cta: string;
};

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For solo founders testing the waters.",
    priceNGN: 0,
    priceLabel: "Free",
    billingNote: "Forever free",
    highlight: false,
    features: [
      "Up to 100 contacts",
      "QR WhatsApp connection",
      "Basic AI replies",
      "Manual conversations",
      "Email support",
    ],
    limits: {
      contacts: "100",
      campaigns: "—",
      ai: "Basic",
    },
    cta: "Current plan",
  },
  {
    id: "growth",
    name: "Growth",
    description: "For teams ready to scale conversations.",
    priceNGN: 20000,
    priceLabel: "₦20,000",
    billingNote: "per month",
    highlight: true,
    features: [
      "Up to 5,000 contacts",
      "Broadcast campaigns",
      "AI automation (Jennifer)",
      "Official WhatsApp API",
      "Auto-tag & lead scoring",
      "Priority email support",
    ],
    limits: {
      contacts: "5,000",
      campaigns: "Unlimited",
      ai: "Full automation",
    },
    cta: "Upgrade to Growth",
  },
  {
    id: "pro",
    name: "Pro",
    description: "For businesses running serious operations.",
    priceNGN: 50000,
    priceLabel: "₦50,000",
    billingNote: "per month",
    highlight: false,
    features: [
      "Unlimited contacts",
      "Priority message delivery",
      "Team access (up to 10 seats)",
      "Advanced analytics",
      "Custom AI training",
      "Dedicated account manager",
      "SLA-backed support",
    ],
    limits: {
      contacts: "Unlimited",
      campaigns: "Unlimited",
      ai: "Custom training",
    },
    cta: "Upgrade to Pro",
  },
];

type Invoice = {
  id: string;
  date: string;
  plan: string;
  amount: string;
  status: "paid" | "pending" | "failed";
};

const mockInvoices: Invoice[] = [
  { id: "INV-2026-004", date: "Apr 01, 2026", plan: "Growth (Monthly)", amount: "₦20,000", status: "paid" },
  { id: "INV-2026-003", date: "Mar 01, 2026", plan: "Growth (Monthly)", amount: "₦20,000", status: "paid" },
  { id: "INV-2026-002", date: "Feb 01, 2026", plan: "Growth (Monthly)", amount: "₦20,000", status: "paid" },
  { id: "INV-2026-001", date: "Jan 01, 2026", plan: "Starter → Growth", amount: "₦20,000", status: "paid" },
];

const faqs = [
  {
    q: "Can I change plans anytime?",
    a: "Yes. Upgrade and the new plan takes effect immediately (prorated). Downgrade and it applies at the end of your billing cycle.",
  },
  {
    q: "What happens if I hit my contact limit?",
    a: "We'll notify you at 90%. You can upgrade or archive contacts. We never delete data without your say-so.",
  },
  {
    q: "Do you offer refunds?",
    a: "Full refund within 14 days of your first paid month. Email us and we'll sort it out same day.",
  },
  {
    q: "Which payment methods are supported?",
    a: "Card, bank transfer, and USSD via Paystack. Local Nigerian methods are fully supported.",
  },
];

function PlanCard({
  plan,
  currentPlan,
  onUpgrade,
  isProcessing,
}: {
  plan: Plan;
  currentPlan: PlanId;
  onUpgrade: (id: PlanId) => void;
  isProcessing: boolean;
}) {
  const isCurrent = plan.id === currentPlan;
  const planOrder: Record<PlanId, number> = { starter: 0, growth: 1, pro: 2 };
  const isDowngrade = planOrder[plan.id] < planOrder[currentPlan];

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/60 transition",
        plan.highlight && !isCurrent && "border-primary/60 shadow-lg shadow-primary/10 scale-[1.02]",
      )}
    >
      {plan.highlight && !isCurrent ? (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-lg bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
          Recommended
        </div>
      ) : null}
      {isCurrent ? (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-lg bg-emerald-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
          Current Plan
        </div>
      ) : null}

      <CardContent className="p-6 pt-8">
        <div className="flex items-center gap-2">
          {plan.id === "starter" ? (
            <Zap className="h-5 w-5 text-muted-foreground" strokeWidth={2} />
          ) : plan.id === "growth" ? (
            <Sparkles className="h-5 w-5 text-primary" strokeWidth={2} />
          ) : (
            <Star className="h-5 w-5 text-purple-600" strokeWidth={2} />
          )}
          <h3 className="text-xl font-black tracking-tight text-foreground">
            {plan.name}
          </h3>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

        <div className="mt-5 flex items-baseline gap-2">
          <span className="text-4xl font-black tracking-tight text-foreground">
            {plan.priceLabel}
          </span>
          <span className="text-sm text-muted-foreground">{plan.billingNote}</span>
        </div>

        <div className="mt-5 space-y-2">
          {plan.features.map((feature) => (
            <div key={feature} className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="h-3 w-3" strokeWidth={3} />
              </div>
              <p className="text-sm text-foreground">{feature}</p>
            </div>
          ))}
        </div>

        <Button
          className="mt-6 w-full"
          disabled={isCurrent || isProcessing || isDowngrade}
          onClick={() => onUpgrade(plan.id)}
          variant={plan.highlight && !isCurrent ? "default" : "outline"}
        >
          {isProcessing
            ? "Processing..."
            : isCurrent
            ? "Current plan"
            : isDowngrade
            ? "Contact support to downgrade"
            : plan.cta}
          {!isCurrent && !isProcessing && !isDowngrade ? (
            <ArrowRight className="ml-1.5 h-4 w-4" />
          ) : null}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function BillingPage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<PlanId>("starter");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [processingId, setProcessingId] = useState<PlanId | null>(null);

  function handleUpgrade(planId: PlanId) {
    setProcessingId(planId);
    // Mock Paystack popup delay
    setTimeout(() => {
      setCurrentPlan(planId);
      setProcessingId(null);
      toast({
        title: "🎉 Upgrade Successful!",
        description: `Your account is now on the ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan.`,
      });
    }, 1500);
  }

  return (
    <UserLayout user={user}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
        {/* Header */}
        <div>
          <p className="text-sm font-medium text-muted-foreground">Billing</p>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            Choose the plan that fits your growth
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
            Start free, upgrade when you need more. All plans include WhatsApp integration, AI replies, and unlimited team members on Pro.
          </p>
        </div>

        {/* Billing cycle toggle */}
        <div className="mt-6 flex items-center gap-2">
          <div className="inline-flex rounded-full bg-muted p-1">
            <button
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-bold transition",
                billingCycle === "monthly"
                  ? "bg-white text-foreground shadow-sm dark:bg-card"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setBillingCycle("monthly")}
              type="button"
            >
              Monthly
            </button>
            <button
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-bold transition",
                billingCycle === "yearly"
                  ? "bg-white text-foreground shadow-sm dark:bg-card"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setBillingCycle("yearly")}
              type="button"
            >
              Yearly
              <span className="ml-1.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-black text-emerald-600">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlan={currentPlan}
              onUpgrade={handleUpgrade}
              isProcessing={processingId === plan.id}
            />
          ))}
        </div>

        {/* Payment method + invoices */}
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {/* Payment method */}
          <Card className="border-border/60 lg:col-span-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Payment method
                  </p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-foreground">
                    Paystack
                  </h3>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                  <CreditCard className="h-5 w-5" strokeWidth={2} />
                </div>
              </div>

              {currentPlan === "starter" ? (
                <div className="mt-4 rounded-xl border border-dashed border-border/80 bg-muted/30 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No payment method on file
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Added automatically when you upgrade.
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        Visa •••• 4242
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Expires 12/27
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Update
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
                <p>🔒 Secured by Paystack with 256-bit encryption.</p>
                <p>📧 Receipts are emailed to {user.email}</p>
              </div>
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card className="border-border/60 lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Billing history
                  </p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-foreground">
                    Your invoices
                  </h3>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download all
                </Button>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-border/60">
                <div className="hidden border-b border-border/60 bg-muted/50 sm:grid sm:grid-cols-[1fr,1.2fr,1fr,0.8fr,auto] sm:gap-4 sm:px-4 sm:py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Invoice</p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Plan</p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Date</p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Amount</p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</p>
                </div>
                {mockInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="grid gap-1 border-b border-border/60 px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[1fr,1.2fr,1fr,0.8fr,auto] sm:gap-4 sm:items-center"
                  >
                    <p className="font-mono text-xs font-semibold text-foreground">{inv.id}</p>
                    <p className="text-foreground">{inv.plan}</p>
                    <p className="text-muted-foreground">{inv.date}</p>
                    <p className="font-semibold text-foreground">{inv.amount}</p>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600">
                        {inv.status}
                      </span>
                      <button className="text-xs font-medium text-primary hover:underline">
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mt-10">
          <h2 className="text-2xl font-black tracking-tight text-foreground">
            Frequently asked questions
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <Card key={faq.q} className="border-border/60">
                <CardContent className="p-5">
                  <p className="text-sm font-bold text-foreground">{faq.q}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
