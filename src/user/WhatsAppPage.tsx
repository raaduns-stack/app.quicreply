import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  MessageCircleMore,
  MessageSquare,
  Phone,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import UserLayout from "./layout/UserLayout";
import { Card, CardContent } from "../client/components/ui/card";
import { Button } from "../client/components/ui/button";
import { Progress } from "../client/components/ui/progress";
import { cn } from "../client/utils";

type Mode = "qr" | "api";
type ApiStatus = "none" | "pending" | "approved";

const modeCards = {
  qr: {
    icon: QrCode,
    title: "QR Mode (Active)",
    eyebrow: "Instant Connect",
    badge: "Default",
  },
  api: {
    icon: ShieldCheck,
    title: "Official API",
    eyebrow: "Advanced",
    badge: "Enterprise",
  },
};

export default function WhatsAppPage({ user }: { user: AuthUser }) {
  // Mock state — will come from getWorkspaceFlags later
  const [mode] = useState<Mode>("qr");
  const [apiStatus] = useState<ApiStatus>("none");
  const [qrConnected, setQrConnected] = useState(true);

  const recentChats = [
    { name: "Sarah Johnson", phone: "+234 801 ••• 4521", preview: "Yes, I'd like to know more about the Growth plan.", time: "2m", unread: 2 },
    { name: "Mike Adebayo", phone: "+234 803 ••• 2299", preview: "Perfect, send me the payment link please.", time: "18m", unread: 0 },
    { name: "Chioma N.", phone: "+234 806 ••• 9812", preview: "AI replied — marked as hot lead.", time: "42m", unread: 0 },
    { name: "David O.", phone: "+234 809 ••• 1144", preview: "Thanks! Will get back by Monday.", time: "2h", unread: 0 },
  ];

  return (
    <UserLayout user={user}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
              WhatsApp Connection
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage how your workspace connects, replies, and scales on WhatsApp.
            </p>
          </div>
          {mode === "qr" && apiStatus === "none" ? (
            <Button asChild className="shrink-0">
              <Link to="/whatsapp/setup">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Official API
              </Link>
            </Button>
          ) : null}
        </div>

        {/* Status cards — side by side */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* QR Mode card */}
          <Card
            className={cn(
              "overflow-hidden border-border/60",
              mode === "qr" && "border-primary/50 shadow-md shadow-primary/10",
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <QrCode className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Instant Connect
                    </p>
                    <h3 className="mt-1 text-xl font-black tracking-tight text-foreground">
                      QR Mode
                    </h3>
                  </div>
                </div>
                {mode === "qr" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                    Active
                  </span>
                ) : null}
              </div>

              {/* Connection status */}
              <div className="mt-5 rounded-xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {qrConnected ? (
                      <>
                        <div className="relative">
                          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                          <div className="absolute inset-0 h-2.5 w-2.5 animate-ping rounded-full bg-emerald-500/70" />
                        </div>
                        <p className="text-sm font-bold text-foreground">Connected</p>
                      </>
                    ) : (
                      <>
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        <p className="text-sm font-bold text-foreground">Disconnected</p>
                      </>
                    )}
                  </div>
                  <Button size="sm" variant="ghost">
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    {qrConnected ? "Refresh" : "Reconnect"}
                  </Button>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>+1 555 123 4567</span>
                  <span>•</span>
                  <span>Last sync: just now</span>
                </div>
              </div>

              {/* Limits */}
              <div className="mt-4 grid gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-foreground">Daily message limit</span>
                    <span className="font-bold text-foreground">432 / 1,000</span>
                  </div>
                  <Progress className="mt-1.5 h-1.5" value={43} />
                </div>
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={2} />
                  <p>
                    QR sessions can disconnect if you log in from another device. Upgrade to API for 24/7 stability.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setQrConnected(!qrConnected)}>
                  {qrConnected ? "Disconnect" : "Scan QR Code"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* API Mode card */}
          <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                    <ShieldCheck className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Official API
                    </p>
                    <h3 className="mt-1 text-xl font-black tracking-tight text-foreground">
                      Meta Business API
                    </h3>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  Not connected
                </span>
              </div>

              <div className="mt-5 space-y-2.5">
                {[
                  "10,000+ messages/day limit",
                  "Green verified badge on WhatsApp",
                  "24/7 uptime guarantee",
                  "Broadcast to unlimited contacts",
                  "Multiple agents on one number",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} />
                    </div>
                    <p className="text-sm text-foreground">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-border/60 bg-white p-4 dark:bg-card">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                    <Clock className="h-4 w-4" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Setup takes ~10 minutes</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      KYC verification, Meta login, and phone number registration.
                    </p>
                  </div>
                </div>
              </div>

              <Button asChild className="mt-5 w-full">
                <Link to="/whatsapp/setup">
                  Start API setup
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Usage stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Messages today
                </p>
                <MessageSquare className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              </div>
              <p className="mt-2 text-3xl font-black tracking-tight text-foreground">432</p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">+24% vs yesterday</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Active conversations
                </p>
                <MessageCircleMore className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              </div>
              <p className="mt-2 text-3xl font-black tracking-tight text-foreground">87</p>
              <p className="mt-1 text-xs text-muted-foreground">12 need your reply</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Avg response time
                </p>
                <TrendingUp className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              </div>
              <p className="mt-2 text-3xl font-black tracking-tight text-foreground">2.4<span className="text-base font-semibold text-muted-foreground"> min</span></p>
              <p className="mt-1 text-xs text-emerald-600 font-medium">AI handles 66%</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent conversations + Webhook */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="border-border/60 lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Recent conversations
                  </p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-foreground">
                    Latest WhatsApp chats
                  </h3>
                </div>
                <Button variant="ghost" size="sm">
                  View inbox
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-4 divide-y divide-border/60">
                {recentChats.map((chat) => (
                  <div key={chat.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
                      {chat.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{chat.name}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">{chat.time}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{chat.preview}</p>
                    </div>
                    {chat.unread > 0 ? (
                      <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-white">
                        {chat.unread}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Webhook
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-foreground">
                Incoming events
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                Messages and status updates stream to your endpoint.
              </p>

              <div className="mt-4 rounded-xl border border-border/60 bg-muted/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Endpoint</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md bg-white px-2 py-1 text-[11px] font-mono text-foreground dark:bg-background">
                    n8n.quicreply.io/webhook/meta
                  </code>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-medium text-emerald-600">Healthy</span>
                  <span className="text-muted-foreground">• 24 events/min</span>
                </div>
              </div>

              <Button variant="outline" size="sm" className="mt-4 w-full">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open webhook logs
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </UserLayout>
  );
}
