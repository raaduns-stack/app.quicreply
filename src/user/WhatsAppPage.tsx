import { useEffect, useMemo, useRef, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  MessageSquare,
  QrCode,
  RefreshCw,
  Rocket,
  Send,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import {
  disconnectWhatsAppQr,
  getWhatsAppMessageLogs,
  getWhatsAppWorkspaceState,
  refreshWhatsAppQrStatus,
  sendWhatsAppTestMessage,
  startWhatsAppQrHandshake,
  updateJenniferStatus,
  useQuery,
} from "wasp/client/operations";
import UserLayout from "./layout/UserLayout";
import { Button } from "../client/components/ui/button";
import { Switch } from "../client/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../client/components/ui/dialog";
import { useToast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";

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
    codeData: string | null;
    sessionId: string | null;
    deviceInfo: string | null;
    lastSeen: string | null;
    checkedAt: string | null;
    lastError: string | null;
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

type WhatsAppMessageLog = {
  id: string;
  direction: "inbound" | "outbound";
  from: string | null;
  to: string | null;
  pushName: string | null;
  messageType: string | null;
  text: string;
  timestamp: string | null;
  status: string | null;
  source: string | null;
};

const qrStatusMeta: Record<
  WhatsAppWorkspaceState["qr"]["status"],
  { label: string; tone: string; dot: string; helper: string }
> = {
  connected: {
    label: "Connected",
    tone: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
    helper: "Your QR session is live and ready to receive replies.",
  },
  pending: {
    label: "Pending",
    tone: "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    dot: "bg-amber-500",
    helper: "Scan the QR code from WhatsApp on your phone to finish linking.",
  },
  disconnected: {
    label: "Disconnected",
    tone: "bg-slate-500/10 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300",
    dot: "bg-slate-400",
    helper: "No live QR session is active right now.",
  },
  expired: {
    label: "Expired",
    tone: "bg-orange-500/10 text-orange-700 dark:bg-orange-400/10 dark:text-orange-300",
    dot: "bg-orange-500",
    helper:
      "The QR expired before it was scanned. Generate a fresh one to continue.",
  },
  failed: {
    label: "Failed",
    tone: "bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-300",
    dot: "bg-red-500",
    helper:
      "The QR session could not be completed. Try starting a fresh handshake.",
  },
};

const apiStatusMeta: Record<
  WhatsAppWorkspaceState["api"]["status"],
  { label: string; tone: string; helper: string }
> = {
  none: {
    label: "Not setup",
    tone: "bg-slate-500/10 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300",
    helper:
      "Start the API setup flow when you need official high-volume messaging.",
  },
  pending: {
    label: "Pending",
    tone: "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    helper:
      "Meta verification is in progress. Complete the KYC flow to activate it.",
  },
  approved: {
    label: "Active",
    tone: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    helper:
      "Your Official API is active and ready for higher-volume messaging.",
  },
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMessageTime(value: string | null) {
  if (!value) {
    return "No timestamp";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No timestamp";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatParticipant(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/@s\.whatsapp\.net|@c\.us|@g\.us/gi, "")
    .replace(/\D(?=\d{6,})/g, "");
}

function getQrImageSrc(codeData: string | null) {
  if (!codeData) {
    return null;
  }

  if (codeData.startsWith("data:image")) {
    return codeData;
  }

  if (/^https?:\/\//i.test(codeData)) {
    return codeData;
  }

  return `data:image/png;base64,${codeData}`;
}

const shellPanelClass =
  "border-[#e6e0d6] bg-white text-[#182235] shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-[#101826] dark:text-slate-100 dark:shadow-none";

const subtlePanelClass =
  "border-[#e6e0d6] bg-[#f8f9fb] dark:border-white/10 dark:bg-[#0b1324]";

const softTextClass = "text-[#667085] dark:text-slate-400";
const strongTextClass = "text-[#182235] dark:text-slate-50";
const outlineButtonClass =
  "border-[#e6e0d6] bg-white text-[#344054] hover:bg-[#fff8ee] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-200 dark:hover:bg-white/5";

export default function WhatsAppPage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery(getWhatsAppWorkspaceState);
  const messageLogsQuery = useQuery(getWhatsAppMessageLogs);
  const [workspaceState, setWorkspaceState] =
    useState<WhatsAppWorkspaceState | null>(null);
  const [messageLogs, setMessageLogs] = useState<WhatsAppMessageLog[]>([]);
  const [isStartingQr, setIsStartingQr] = useState(false);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [isRefreshingMessageLogs, setIsRefreshingMessageLogs] = useState(false);
  const [isDisconnectingQr, setIsDisconnectingQr] = useState(false);
  const [isUpdatingJennifer, setIsUpdatingJennifer] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Hi, this is a QuicReply test message.",
  );
  const [isSendingTestMessage, setIsSendingTestMessage] = useState(false);
  const [isQrPreviewOpen, setIsQrPreviewOpen] = useState(false);
  const pollInFlightRef = useRef(false);

  useEffect(() => {
    if (data) {
      setWorkspaceState(data as WhatsAppWorkspaceState);
    }
  }, [data]);

  useEffect(() => {
    if (messageLogsQuery.data) {
      setMessageLogs(messageLogsQuery.data as WhatsAppMessageLog[]);
    }
  }, [messageLogsQuery.data]);

  useEffect(() => {
    if (
      !workspaceState?.qr.sessionId ||
      workspaceState.qr.status !== "pending"
    ) {
      return;
    }

    let isCancelled = false;

    const intervalId = window.setInterval(async () => {
      if (pollInFlightRef.current) {
        return;
      }

      pollInFlightRef.current = true;

      try {
        const nextState = (await refreshWhatsAppQrStatus(
          {},
        )) as WhatsAppWorkspaceState;

        if (isCancelled) {
          return;
        }

        setWorkspaceState(nextState);

        if (nextState.qr.status === "connected") {
          toast({
            title: "WhatsApp connected",
            description:
              "The QR session is now live and ready for inbound conversations.",
          });
        }
      } catch (err: any) {
        if (!isCancelled) {
          setWorkspaceState((currentState) =>
            currentState
              ? {
                  ...currentState,
                  qr: { ...currentState.qr, status: "failed" },
                }
              : currentState,
          );
          toast({
            variant: "destructive",
            title: "Could not refresh QR status",
            description: err?.message || "Please try again.",
          });
        }
      } finally {
        pollInFlightRef.current = false;
      }
    }, 5000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [workspaceState?.qr.sessionId, workspaceState?.qr.status, toast]);

  const qrState = workspaceState?.qr;
  const apiState = workspaceState?.api;
  const qrStatus = qrState?.status ?? "disconnected";
  const apiStatus = apiState?.status ?? "none";
  const qrImageSrc = useMemo(
    () => getQrImageSrc(qrState?.codeData ?? null),
    [qrState?.codeData],
  );
  const connectedAccount =
    qrState?.deviceInfo && !qrState.deviceInfo.startsWith("quicreply-")
      ? qrState.deviceInfo
      : null;
  const metrics = workspaceState?.metrics ?? {
    totalMessages: 0,
    activeSessions: 0,
    qrUsageToday: 0,
    aiReplies: 0,
  };
  const qrUsagePercent = Math.min(
    100,
    Math.round((metrics.qrUsageToday / 500) * 100),
  );

  async function handleStartQrHandshake() {
    setIsStartingQr(true);

    try {
      const nextState = (await startWhatsAppQrHandshake({
        forceFresh: qrState?.connected || qrStatus === "connected",
      })) as WhatsAppWorkspaceState;
      setWorkspaceState(nextState);
      if (nextState.qr.status === "connected" || nextState.qr.connected) {
        toast({
          title: "WhatsApp already connected",
          description:
            "Evolution reports this workspace has a live WhatsApp session.",
        });
      } else if (nextState.qr.codeData) {
        toast({
          title: "QR generated",
          description:
            "Scan the QR code from WhatsApp on your phone to complete the link.",
        });
      } else {
        toast({
          title: "QR session started",
          description: "Evolution is preparing the QR. Refresh in a moment.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not start WhatsApp handshake",
        description: err?.message || "Please try again.",
      });
    } finally {
      setIsStartingQr(false);
    }
  }

  async function handleRefreshQr() {
    setIsRefreshingQr(true);

    try {
      const nextState = (await refreshWhatsAppQrStatus(
        {},
      )) as WhatsAppWorkspaceState;
      setWorkspaceState(nextState);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not refresh QR status",
        description: err?.message || "Please try again.",
      });
    } finally {
      setIsRefreshingQr(false);
    }
  }

  async function handleDisconnectQr() {
    setIsDisconnectingQr(true);

    try {
      const nextState = (await disconnectWhatsAppQr(
        {},
      )) as WhatsAppWorkspaceState;
      setWorkspaceState(nextState);
      toast({
        title: "QR disconnected",
        description: "The QR session has been reset for this workspace.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not disconnect QR",
        description: err?.message || "Please try again.",
      });
    } finally {
      setIsDisconnectingQr(false);
    }
  }

  async function handleJenniferToggle(nextValue: boolean) {
    setWorkspaceState((currentState) =>
      currentState ? { ...currentState, isAiActive: nextValue } : currentState,
    );
    setIsUpdatingJennifer(true);

    try {
      const nextState = (await updateJenniferStatus({
        isAiActive: nextValue,
      })) as WhatsAppWorkspaceState;
      setWorkspaceState(nextState);
    } catch (err: any) {
      setWorkspaceState((currentState) =>
        currentState
          ? { ...currentState, isAiActive: !nextValue }
          : currentState,
      );
      toast({
        variant: "destructive",
        title: "Could not update Jennifer",
        description: err?.message || "Please try again.",
      });
    } finally {
      setIsUpdatingJennifer(false);
    }
  }

  async function handleRefreshMessageLogs() {
    setIsRefreshingMessageLogs(true);

    try {
      const result = await messageLogsQuery.refetch();
      if (result.data) {
        setMessageLogs(result.data as WhatsAppMessageLog[]);
      }
      toast({
        title: "Message logs refreshed",
        description: "Latest WhatsApp logs were loaded from the backend.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not refresh message logs",
        description: err?.message || "Please try again.",
      });
    } finally {
      setIsRefreshingMessageLogs(false);
    }
  }

  async function handleSendTestMessage() {
    setIsSendingTestMessage(true);

    try {
      await sendWhatsAppTestMessage({
        phoneNumber: testPhoneNumber,
        message: testMessage,
      });
      toast({
        title: "Test message sent",
        description: "Evolution accepted the outbound WhatsApp message.",
      });
      await handleRefreshMessageLogs();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not send test message",
        description: err?.message || "Please try again.",
      });
    } finally {
      setIsSendingTestMessage(false);
    }
  }

  return (
    <UserLayout user={user}>
      <div className="w-full min-w-0 space-y-5">
        {/* ── Page Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">
                WhatsApp
              </h1>
              {/* QR connected pill */}
              {workspaceState?.qr.connected && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  QR Connected
                </span>
              )}
              {/* Limited mode pill - show when not on API */}
              {workspaceState?.whatsappMode !== "api" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  QR Only · Limited Mode
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage WhatsApp connections, session health, API configuration,
              and automation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className={cn("gap-1.5", outlineButtonClass)}
              disabled={isStartingQr || isLoading}
              onClick={handleStartQrHandshake}
            >
              <RefreshCw className="h-4 w-4" />
              Reconnect
            </Button>
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/whatsapp/setup">
                <Rocket className="h-4 w-4" />
                Upgrade to API
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            Could not load WhatsApp workspace state. Refresh and try again.
          </div>
        )}

        {/* ── Alert Strip (QR limit warning) ── */}
        {workspaceState?.whatsappMode !== "api" && (
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-100 dark:border-amber-400/20 dark:bg-amber-400/10">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                You're approaching QR limits
              </p>
              <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                QR mode is limited to ~500 messages/day. Upgrade to the Official
                WhatsApp API to unlock 10,000+ messages, templates, and stable
                delivery.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/whatsapp/setup">
                  <Rocket className="h-3.5 w-3.5" />
                  Upgrade Now
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "Total Messages",
              value: metrics.totalMessages.toLocaleString(),
              sub: (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  Real{" "}
                  <span className="text-slate-400 font-normal">from logs</span>
                </span>
              ),
            },
            {
              label: "Active Sessions",
              value: metrics.activeSessions.toLocaleString(),
              sub: (
                <span className="text-xs text-slate-400">
                  {workspaceState?.qr.connected
                    ? "QR Mode active"
                    : "No active session"}
                </span>
              ),
            },
            {
              label: "QR Usage Today",
              value: metrics.qrUsageToday.toLocaleString(),
              sub: (
                <div className="mt-1">
                  <div className="mb-1 flex justify-between">
                    <span className="text-xs text-slate-400">
                      of ~500 limit
                    </span>
                    <span className="text-xs font-bold text-amber-600">
                      {qrUsagePercent}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${qrUsagePercent}%` }}
                    />
                  </div>
                </div>
              ),
            },
            {
              label: "AI Replies",
              value: metrics.aiReplies.toLocaleString(),
              sub: (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  Real{" "}
                  <span className="text-slate-400 font-normal">
                    n8n replies
                  </span>
                </span>
              ),
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-[#e8e2d8] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {kpi.label}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-[#182235] dark:text-white">
                {kpi.value}
              </p>
              <div className="mt-1">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Main Grid: Left (Mode Cards + Jennifer) + Right Sidebar ── */}
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          {/* LEFT COLUMN */}
          <div className="min-w-0 space-y-5">
            {/* Mode Cards: QR + Official API side by side */}
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
              {/* QR Mode Card */}
              <div
                className={cn(
                  "relative overflow-hidden rounded-xl border shadow-sm dark:shadow-none",
                  qrStatus === "connected"
                    ? "border-emerald-300 dark:border-emerald-500/30"
                    : "border-[#e8e2d8] dark:border-white/10",
                  "bg-white dark:bg-[#0d1524]",
                )}
              >
                {/* Top accent line */}
                <div className="h-[3px] w-full bg-[#25d366]" />
                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b border-[#f3f4f6] px-5 py-4 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-400/10">
                      <QrCode className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#182235] dark:text-white">
                        QR Mode
                      </p>
                      <p className="text-xs text-slate-400">Instant session</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                      qrStatusMeta[qrStatus].tone,
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        qrStatusMeta[qrStatus].dot,
                        qrStatus === "connected" && "animate-pulse",
                      )}
                    />
                    {qrStatusMeta[qrStatus].label}
                  </span>
                </div>
                {/* Body */}
                <div className="px-5 py-4 space-y-0">
                  {[
                    {
                      label: "Connected account",
                      value:
                        connectedAccount ??
                        (qrStatus === "connected"
                          ? "Refresh to sync account"
                          : "—"),
                    },
                    {
                      label: "Session ID",
                      value: workspaceState?.qr.sessionId
                        ? workspaceState.qr.sessionId.substring(0, 24) + "…"
                        : "—",
                    },
                    {
                      label: "Last seen",
                      value: formatDateTime(
                        workspaceState?.qr.lastSeen ?? null,
                      ),
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between border-b border-[#f9fafb] py-2.5 last:border-b-0 dark:border-white/5"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {row.label}
                      </span>
                      <span className="text-xs font-bold text-[#182235] dark:text-white max-w-[160px] truncate text-right">
                        {row.value}
                      </span>
                    </div>
                  ))}
                  {/* QR image / status area */}
                  <div
                    className={cn(
                      "mt-3 flex min-h-[80px] items-center justify-center rounded-lg border p-3",
                      "border-[#f0f0f0] bg-[#f9fafb] dark:border-white/5 dark:bg-white/5",
                    )}
                  >
                    {isLoading ? (
                      <Loader2
                        className={cn("h-6 w-6 animate-spin", softTextClass)}
                      />
                    ) : qrImageSrc ? (
                      <button
                        aria-label="Preview WhatsApp QR code"
                        className="group relative rounded-lg border border-white/10 bg-white p-1.5 shadow-sm transition hover:scale-[1.03] hover:border-[#fe901d]/50 hover:shadow-[0_0_0_4px_rgba(254,144,29,0.12)] focus:outline-none focus:ring-2 focus:ring-[#fe901d] focus:ring-offset-2 focus:ring-offset-[#111827]"
                        onClick={() => setIsQrPreviewOpen(true)}
                        type="button"
                      >
                        <img
                          alt="WhatsApp QR code"
                          className="h-20 w-20 object-contain"
                          src={qrImageSrc}
                        />
                        <span className="absolute inset-x-1 bottom-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                          Preview
                        </span>
                      </button>
                    ) : qrStatus === "connected" ? (
                      <div className="flex flex-col items-center gap-1.5 text-center text-emerald-600 dark:text-emerald-400 sm:flex-row sm:text-left">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-semibold">
                          Session healthy · Messages flowing
                        </span>
                      </div>
                    ) : qrStatus === "pending" ? (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-semibold">
                          Generating QR…
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        Generate a QR to link your phone
                      </span>
                    )}
                  </div>
                  {workspaceState?.qr.lastError && (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
                      {workspaceState.qr.lastError}
                    </div>
                  )}
                </div>
                {/* Footer */}
                <div className="flex flex-wrap gap-2 border-t border-[#f3f4f6] px-5 py-3 dark:border-white/10">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 min-w-[120px]"
                    disabled={isStartingQr || isLoading}
                    onClick={handleStartQrHandshake}
                  >
                    {isStartingQr ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <QrCode className="h-3.5 w-3.5" />
                    )}
                    {isStartingQr
                      ? "Generating..."
                      : qrStatus === "connected"
                        ? "Start fresh QR"
                        : "Connect WhatsApp"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn("gap-1.5", outlineButtonClass)}
                    disabled={
                      isRefreshingQr ||
                      isLoading ||
                      !workspaceState?.qr.sessionId
                    }
                    onClick={handleRefreshQr}
                  >
                    {isRefreshingQr ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                    disabled={
                      isDisconnectingQr ||
                      isLoading ||
                      (!workspaceState?.qr.sessionId &&
                        workspaceState?.qr.status === "disconnected")
                    }
                    onClick={handleDisconnectQr}
                    title="Disconnect session"
                  >
                    {isDisconnectingQr ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Unplug className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Official API Card */}
              <div className="relative overflow-hidden rounded-xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
                {/* Top accent line */}
                <div className="h-[3px] w-full bg-[#fe901d]" />
                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b border-[#f3f4f6] px-5 py-4 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff3e1] dark:bg-[rgba(254,144,29,0.12)]">
                      <ShieldCheck className="h-4 w-4 text-[#fe901d]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#182235] dark:text-white">
                        Official API
                      </p>
                      <p className="text-xs text-slate-400">
                        Meta Business API
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                      apiStatusMeta[apiStatus].tone,
                    )}
                  >
                    {apiStatusMeta[apiStatus].label}
                  </span>
                </div>
                {/* Body */}
                <div className="px-5 py-4">
                  {apiStatus === "none" ? (
                    <div className="mb-3 flex flex-col items-center rounded-lg border border-[#f3f4f6] bg-[#f9fafb] p-4 text-center dark:border-white/5 dark:bg-white/5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#fddcaa] bg-[#fff3e1] dark:border-[rgba(254,144,29,0.2)] dark:bg-[rgba(254,144,29,0.1)]">
                        <ShieldCheck className="h-5 w-5 text-[#fe901d]" />
                      </div>
                      <p className="mt-2 text-sm font-bold text-[#182235] dark:text-white">
                        Unlock High-Volume Messaging
                      </p>
                      <p className="mt-1 text-xs text-slate-400 leading-5">
                        Send 10,000+ messages/day with verified delivery,
                        templates, and broadcast scheduling.
                      </p>
                    </div>
                  ) : null}
                  {[
                    {
                      label: "Phone number",
                      value: workspaceState?.api.phoneNumber || "—",
                    },
                    {
                      label: "API status",
                      value: apiStatusMeta[apiStatus].label,
                    },
                    {
                      label: "Messaging limit",
                      value:
                        workspaceState?.api.messagingLimit ||
                        "Up to 100k/day after verification",
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between border-b border-[#f9fafb] py-2.5 last:border-b-0 dark:border-white/5"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {row.label}
                      </span>
                      <span className="text-xs font-bold text-[#182235] dark:text-white max-w-[160px] truncate text-right">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Footer */}
                <div className="flex flex-wrap gap-2 border-t border-[#f3f4f6] px-5 py-3 dark:border-white/10">
                  <Button
                    asChild
                    size="sm"
                    className="flex-1 gap-1.5 min-w-[120px]"
                  >
                    <Link to="/whatsapp/setup">
                      <Rocket className="h-3.5 w-3.5" />
                      {apiStatus === "none" ? "Set Up API" : "Open API Setup"}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className={cn("gap-1.5", outlineButtonClass)}
                  >
                    <Link to="/whatsapp/setup">Learn More</Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Jennifer AI Toggle */}
            <div className="rounded-xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f3f4f6] px-5 py-4 dark:border-white/10">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#182235] dark:text-white">
                    Automation Engine (Jennifer)
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Controls whether Jennifer auto-replies to incoming WhatsApp
                    messages via n8n
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      workspaceState?.isAiActive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : softTextClass,
                    )}
                  >
                    {workspaceState?.isAiActive ? "Active" : "Muted"}
                  </span>
                  <Switch
                    checked={workspaceState?.isAiActive ?? false}
                    disabled={isUpdatingJennifer || isLoading}
                    onCheckedChange={handleJenniferToggle}
                  />
                </div>
              </div>
              <div className="px-5 py-4">
                <div
                  className={cn(
                    "rounded-lg border p-3",
                    "border-[#f3f4f6] bg-[#f9fafb] dark:border-white/5 dark:bg-white/5",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 text-sm font-semibold",
                      strongTextClass,
                    )}
                  >
                    <Bot className={cn("h-4 w-4", softTextClass)} />
                    Current behavior
                  </div>
                  <p className={cn("mt-1 text-sm", softTextClass)}>
                    {workspaceState?.isAiActive
                      ? "Jennifer is allowed to answer incoming messages automatically."
                      : "Jennifer is muted. Human agents or other automation steps can continue without AI auto-replies."}
                  </p>
                </div>
              </div>
            </div>

            {/* Message Logs */}
            <div className="rounded-xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
              <div className="flex items-center justify-between border-b border-[#f3f4f6] px-5 py-4 dark:border-white/10">
                <div>
                  <p className="text-sm font-bold text-[#182235] dark:text-white">
                    Message Logs
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Latest WhatsApp activity pulled from the backend
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn("gap-1.5", outlineButtonClass)}
                  disabled={
                    messageLogsQuery.isLoading || isRefreshingMessageLogs
                  }
                  onClick={handleRefreshMessageLogs}
                >
                  {isRefreshingMessageLogs ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Refresh logs
                </Button>
              </div>
              <div className="divide-y divide-[#f9fafb] dark:divide-white/5">
                {messageLogsQuery.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2
                      className={cn("h-6 w-6 animate-spin", softTextClass)}
                    />
                  </div>
                ) : messageLogs.length ? (
                  messageLogs.slice(0, 6).map((log) => {
                    const participant =
                      log.direction === "inbound"
                        ? log.pushName || formatParticipant(log.from)
                        : formatParticipant(log.to);
                    return (
                      <div
                        key={log.id}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#fafafa] dark:hover:bg-white/5"
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            log.direction === "inbound"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
                              : "bg-[#fe901d]/10 text-[#fe901d]",
                          )}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p
                              className={cn(
                                "truncate text-sm font-semibold",
                                strongTextClass,
                              )}
                            >
                              {participant}
                            </p>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                                log.direction === "inbound"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
                                  : "bg-[#fe901d]/10 text-[#c96a00] dark:text-[#ffb45b]",
                              )}
                            >
                              {log.direction}
                            </span>
                          </div>
                          <p
                            className={cn(
                              "mt-0.5 truncate text-xs",
                              softTextClass,
                            )}
                          >
                            {log.text}
                          </p>
                        </div>
                        <span className={cn("shrink-0 text-xs", softTextClass)}>
                          {formatMessageTime(log.timestamp)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className={cn("h-8 w-8", softTextClass)} />
                    <p
                      className={cn(
                        "mt-2 text-sm font-semibold",
                        strongTextClass,
                      )}
                    >
                      No message logs yet
                    </p>
                    <p className={cn("mt-1 text-xs", softTextClass)}>
                      Once connected, recent logs will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Send Test Message */}
            <div className="rounded-xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
              <div className="border-b border-[#f3f4f6] px-5 py-4 dark:border-white/10">
                <p className="text-sm font-bold text-[#182235] dark:text-white">
                  Send Test Message
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify outbound delivery through the linked QR instance
                </p>
              </div>
              <div className="space-y-4 px-5 py-4">
                <label className="block">
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      softTextClass,
                    )}
                  >
                    Recipient number
                  </span>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[#e8e2d8] bg-white px-3 text-sm text-[#182235] outline-none transition placeholder:text-slate-400 focus:border-[#fe901d] focus:ring-2 focus:ring-[#fe901d]/20 dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-100 dark:placeholder:text-slate-600"
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="e.g. 2348012345678"
                    value={testPhoneNumber}
                  />
                </label>
                <label className="block">
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      softTextClass,
                    )}
                  >
                    Message
                  </span>
                  <textarea
                    className="mt-2 min-h-[88px] w-full resize-none rounded-lg border border-[#e8e2d8] bg-white px-3 py-2.5 text-sm text-[#182235] outline-none transition placeholder:text-slate-400 focus:border-[#fe901d] focus:ring-2 focus:ring-[#fe901d]/20 dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-100 dark:placeholder:text-slate-600"
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Type a short WhatsApp test message"
                    value={testMessage}
                  />
                </label>
                <Button
                  className="w-full gap-1.5"
                  disabled={
                    isSendingTestMessage ||
                    !workspaceState?.qr.connected ||
                    !testPhoneNumber.trim() ||
                    !testMessage.trim()
                  }
                  onClick={handleSendTestMessage}
                >
                  {isSendingTestMessage ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send test message
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          {/* /LEFT COLUMN */}

          {/* RIGHT SIDEBAR */}
          <div className="min-w-0 space-y-4">
            {/* Connection Health */}
            <div className="rounded-xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
              <div className="flex items-center justify-between border-b border-[#f3f4f6] px-5 py-3.5 dark:border-white/10">
                <p className="text-sm font-bold text-[#182235] dark:text-white">
                  Connection Health
                </p>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Live
                </span>
              </div>
              <div className="space-y-3 px-5 py-4">
                {[
                  {
                    label: "QR Session",
                    status: workspaceState?.qr.connected ? "Online" : "Offline",
                    ok: workspaceState?.qr.connected ?? false,
                  },
                  {
                    label: "API Mode",
                    status: apiStatus === "approved" ? "Active" : "Not Setup",
                    ok: apiStatus === "approved",
                  },
                  {
                    label: "AI Engine",
                    status: workspaceState?.isAiActive ? "Active" : "Muted",
                    ok: workspaceState?.isAiActive ?? false,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {item.ok ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                      <span className="text-sm font-semibold text-[#374054] dark:text-slate-300">
                        {item.label}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
                        item.ok
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
                          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
                <div className="border-t border-[#f3f4f6] pt-3 dark:border-white/10 flex justify-between">
                  <span className="text-xs text-slate-400">
                    Uptime this month
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    99.4%
                  </span>
                </div>
              </div>
            </div>

            {/* Upgrade to API CTA */}
            {workspaceState?.whatsappMode !== "api" && (
              <div className="rounded-xl border border-[#fe901d]/20 bg-gradient-to-br from-[#fff7ed] to-white p-5 dark:border-[#fe901d]/20 dark:from-[#fe901d]/5 dark:to-transparent">
                <div className="flex items-center gap-2 mb-3">
                  <Rocket className="h-5 w-5 text-[#fe901d]" />
                  <span className="text-sm font-bold text-[#182235] dark:text-white">
                    Upgrade to API
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-5">
                  You're at{" "}
                  <strong className="text-amber-600">
                    68% of your QR daily limit
                  </strong>
                  . Upgrade to unlock:
                </p>
                <div className="space-y-2 mb-4">
                  {[
                    "10,000+ messages/day",
                    "Message templates & broadcasts",
                    "Verified green tick badge",
                    "No session drops or bans",
                  ].map((feat) => (
                    <div key={feat} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs text-slate-600 dark:text-slate-300">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
                <Button asChild className="w-full gap-1.5">
                  <Link to="/whatsapp/setup">
                    <Rocket className="h-4 w-4" />
                    Upgrade Now
                  </Link>
                </Button>
              </div>
            )}

            {/* Quick Actions */}
            <div className="rounded-xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
              <div className="border-b border-[#f3f4f6] px-5 py-3.5 dark:border-white/10">
                <p className="text-sm font-bold text-[#182235] dark:text-white">
                  Quick Actions
                </p>
              </div>
              <div className="space-y-1.5 p-3">
                {[
                  {
                    icon: <QrCode className="h-4 w-4 text-emerald-600" />,
                    label: "Re-scan QR Code",
                    onClick: handleStartQrHandshake,
                  },
                  {
                    icon: <ShieldCheck className="h-4 w-4 text-[#fe901d]" />,
                    label: "Set Up API",
                    href: "/whatsapp/setup",
                  },
                  {
                    icon: <Bot className="h-4 w-4 text-[#fe901d]" />,
                    label: "Manage Jennifer AI",
                    href: "/settings",
                  },
                ].map((action) =>
                  action.href ? (
                    <Link
                      key={action.label}
                      to={action.href}
                      className="flex items-center gap-3 rounded-lg border border-[#e8e2d8] bg-[#f9fafb] px-3 py-2.5 text-sm font-semibold text-[#374054] transition-colors hover:bg-[#f3f4f6] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      {action.icon} {action.label}
                    </Link>
                  ) : (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className="flex w-full items-center gap-3 rounded-lg border border-[#e8e2d8] bg-[#f9fafb] px-3 py-2.5 text-left text-sm font-semibold text-[#374054] transition-colors hover:bg-[#f3f4f6] dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                    >
                      {action.icon} {action.label}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
          {/* /RIGHT SIDEBAR */}
        </div>
        {/* /Main Grid */}
        <Dialog open={isQrPreviewOpen} onOpenChange={setIsQrPreviewOpen}>
          <DialogContent className="w-[min(92vw,520px)] max-w-none border-white/10 bg-[#070b14] p-5 text-white shadow-2xl sm:rounded-2xl">
            <div className="space-y-4 text-center">
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Scan WhatsApp QR
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-slate-300">
                  Open WhatsApp &gt; Linked Devices &gt; Link a Device.
                </DialogDescription>
              </div>
              <div className="mx-auto grid h-[min(76vw,420px)] w-[min(76vw,420px)] place-items-center rounded-2xl bg-white p-4">
                {qrImageSrc ? (
                  <img
                    alt="WhatsApp QR code enlarged"
                    className="h-full w-full object-contain"
                    src={qrImageSrc}
                  />
                ) : null}
              </div>
              <p className="text-xs text-slate-400">
                Click outside or press Escape to close.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </UserLayout>
  );
}
