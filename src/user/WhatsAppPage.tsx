import { useEffect, useMemo, useRef, useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link } from "react-router";
import {
  ArrowRight,
  Bot,
  Clock,
  ExternalLink,
  Link2,
  Loader2,
  MessageSquare,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Unplug,
} from "lucide-react";
import {
  disconnectWhatsAppQr,
  getWhatsAppWorkspaceState,
  refreshWhatsAppQrStatus,
  startWhatsAppQrHandshake,
  updateJenniferStatus,
  useQuery,
} from "wasp/client/operations";
import UserLayout from "./layout/UserLayout";
import { Card, CardContent } from "../client/components/ui/card";
import { Button } from "../client/components/ui/button";
import { Switch } from "../client/components/ui/switch";
import { useToast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";

type WhatsAppWorkspaceState = {
  whatsappMode: "qr" | "api" | "both";
  isAiActive: boolean;
  qr: {
    status: "disconnected" | "pending" | "connected" | "expired" | "failed";
    connected: boolean;
    codeData: string | null;
    sessionId: string | null;
    deviceInfo: string | null;
    lastSeen: string | null;
    checkedAt: string | null;
  };
  api: {
    status: "none" | "pending" | "approved";
    phoneNumber: string | null;
    messagingLimit: string | null;
  };
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
  const [workspaceState, setWorkspaceState] =
    useState<WhatsAppWorkspaceState | null>(null);
  const [isStartingQr, setIsStartingQr] = useState(false);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [isDisconnectingQr, setIsDisconnectingQr] = useState(false);
  const [isUpdatingJennifer, setIsUpdatingJennifer] = useState(false);
  const pollInFlightRef = useRef(false);

  useEffect(() => {
    if (data) {
      setWorkspaceState(data as WhatsAppWorkspaceState);
    }
  }, [data]);

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

  async function handleStartQrHandshake() {
    setIsStartingQr(true);

    try {
      const nextState = (await startWhatsAppQrHandshake(
        {},
      )) as WhatsAppWorkspaceState;
      setWorkspaceState(nextState);
      toast({
        title: "QR generated",
        description:
          "Scan the QR code from WhatsApp on your phone to complete the link.",
      });
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

  return (
    <UserLayout user={user}>
      <div className="mx-auto w-full max-w-7xl px-2 py-4 md:px-4 md:py-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className={cn("text-sm font-semibold", softTextClass)}>
              WhatsApp
            </p>
            <h1 className="text-3xl font-black tracking-tight text-[#182235] dark:text-slate-50 md:text-4xl">
              WhatsApp Management
            </h1>
            <p className={cn("mt-1 text-sm", softTextClass)}>
              Manage your QR and Official API instances, then control whether
              Jennifer can auto-reply.
            </p>
          </div>

          <Button asChild className="shrink-0">
            <Link to="/whatsapp/setup">
              <Sparkles className="mr-2 h-4 w-4" />
              Official API setup
            </Link>
          </Button>
        </div>

        {error ? (
          <Card className="mt-6 border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10">
            <CardContent className="p-5 text-sm font-medium text-red-700">
              We could not load your WhatsApp workspace state right now. Refresh
              and try again.
            </CardContent>
          </Card>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card className={shellPanelClass}>
            <CardContent className="p-5">
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  softTextClass,
                )}
              >
                Active mode
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-[#182235] dark:text-slate-50">
                {workspaceState?.whatsappMode === "both"
                  ? "QR + API"
                  : workspaceState?.whatsappMode === "api"
                    ? "API"
                    : "QR"}
              </p>
              <p className={cn("mt-1 text-xs", softTextClass)}>
                Workspace routing updates automatically as connections change.
              </p>
            </CardContent>
          </Card>

          <Card className={shellPanelClass}>
            <CardContent className="p-5">
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  softTextClass,
                )}
              >
                Jennifer
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-[#182235] dark:text-slate-50">
                {workspaceState?.isAiActive ? "Active" : "Muted"}
              </p>
              <p className={cn("mt-1 text-xs", softTextClass)}>
                n8n can read this database flag before sending any AI reply.
              </p>
            </CardContent>
          </Card>

          <Card className={shellPanelClass}>
            <CardContent className="p-5">
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  softTextClass,
                )}
              >
                Last QR check
              </p>
              <p className="mt-2 text-xl font-black tracking-tight text-[#182235] dark:text-slate-50">
                {formatDateTime(workspaceState?.qr.checkedAt ?? null)}
              </p>
              <p className={cn("mt-1 text-xs", softTextClass)}>
                Polling runs every 5 seconds while a QR session is pending.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card
            className={cn(
              shellPanelClass,
              "overflow-hidden",
              qrStatus === "connected" &&
                "border-emerald-500/40 shadow-md shadow-emerald-500/10 dark:border-emerald-400/30",
              qrStatus === "pending" &&
                "border-amber-500/40 shadow-md shadow-amber-500/10 dark:border-amber-400/30",
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300">
                    <QrCode className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-[11px] font-semibold uppercase tracking-[0.14em]",
                        softTextClass,
                      )}
                    >
                      QR Instance
                    </p>
                    <h2
                      className={cn(
                        "mt-1 text-xl font-black tracking-tight",
                        strongTextClass,
                      )}
                    >
                      Connect WhatsApp
                    </h2>
                  </div>
                </div>

                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                    qrStatusMeta[qrStatus].tone,
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      qrStatusMeta[qrStatus].dot,
                    )}
                  />
                  {qrStatusMeta[qrStatus].label}
                </span>
              </div>

              <p className={cn("mt-4 text-sm", softTextClass)}>
                {qrStatusMeta[qrStatus].helper}
              </p>

              <div className="mt-5 grid gap-4 lg:grid-cols-[220px_1fr]">
                <div
                  className={cn(
                    "flex min-h-[220px] items-center justify-center rounded-2xl border p-4",
                    subtlePanelClass,
                  )}
                >
                  {isLoading ? (
                    <Loader2
                      className={cn("h-8 w-8 animate-spin", softTextClass)}
                    />
                  ) : qrImageSrc ? (
                    <img
                      alt="WhatsApp QR code"
                      className="h-full w-full rounded-xl object-contain"
                      src={qrImageSrc}
                    />
                  ) : (
                    <div
                      className={cn(
                        "flex flex-col items-center text-center",
                        softTextClass,
                      )}
                    >
                      <QrCode className="h-14 w-14" strokeWidth={1.5} />
                      <p
                        className={cn(
                          "mt-3 text-sm font-semibold",
                          strongTextClass,
                        )}
                      >
                        No active QR image
                      </p>
                      <p className="mt-1 text-xs">
                        Generate a QR session to link a phone instantly.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div
                    className={cn("rounded-xl border p-4", subtlePanelClass)}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2 text-sm font-semibold",
                        strongTextClass,
                      )}
                    >
                      <Smartphone className={cn("h-4 w-4", softTextClass)} />
                      Device info
                    </div>
                    <p className={cn("mt-1 text-sm", softTextClass)}>
                      {workspaceState?.qr.deviceInfo ||
                        "Not available until the session is connected."}
                    </p>
                  </div>

                  <div
                    className={cn("rounded-xl border p-4", subtlePanelClass)}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2 text-sm font-semibold",
                        strongTextClass,
                      )}
                    >
                      <Clock className={cn("h-4 w-4", softTextClass)} />
                      Last seen
                    </div>
                    <p className={cn("mt-1 text-sm", softTextClass)}>
                      {formatDateTime(workspaceState?.qr.lastSeen ?? null)}
                    </p>
                  </div>

                  <div
                    className={cn("rounded-xl border p-4", subtlePanelClass)}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-2 text-sm font-semibold",
                        strongTextClass,
                      )}
                    >
                      <Link2 className={cn("h-4 w-4", softTextClass)} />
                      Session
                    </div>
                    <p className={cn("mt-1 break-all text-xs", softTextClass)}>
                      {workspaceState?.qr.sessionId || "No live session"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <Button
                  className="md:flex-1"
                  disabled={isStartingQr || isLoading}
                  onClick={handleStartQrHandshake}
                >
                  {isStartingQr ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating QR
                    </>
                  ) : (
                    <>
                      <QrCode className="mr-2 h-4 w-4" />
                      {qrStatus === "pending"
                        ? "Generate new QR"
                        : "Connect WhatsApp"}
                    </>
                  )}
                </Button>

                <Button
                  className={cn("md:flex-1", outlineButtonClass)}
                  disabled={
                    isRefreshingQr || isLoading || !workspaceState?.qr.sessionId
                  }
                  onClick={handleRefreshQr}
                  variant="outline"
                >
                  {isRefreshingQr ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh status
                    </>
                  )}
                </Button>

                <Button
                  disabled={
                    isDisconnectingQr ||
                    isLoading ||
                    (!workspaceState?.qr.sessionId &&
                      workspaceState?.qr.status === "disconnected")
                  }
                  onClick={handleDisconnectQr}
                  variant="ghost"
                  className="text-[#667085] hover:bg-[#fff8ee] hover:text-[#c96a00] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
                >
                  {isDisconnectingQr ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting
                    </>
                  ) : (
                    <>
                      <Unplug className="mr-2 h-4 w-4" />
                      Reset QR
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              shellPanelClass,
              "overflow-hidden bg-[linear-gradient(135deg,rgba(254,144,29,0.08),rgba(255,255,255,0.96))] dark:bg-[linear-gradient(135deg,rgba(254,144,29,0.10),rgba(16,24,38,0.96))]",
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300">
                    <ShieldCheck className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-[11px] font-semibold uppercase tracking-[0.14em]",
                        softTextClass,
                      )}
                    >
                      Official API
                    </p>
                    <h2
                      className={cn(
                        "mt-1 text-xl font-black tracking-tight",
                        strongTextClass,
                      )}
                    >
                      Meta Business API
                    </h2>
                  </div>
                </div>

                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                    apiStatusMeta[apiStatus].tone,
                  )}
                >
                  {apiStatusMeta[apiStatus].label}
                </span>
              </div>

              <p className={cn("mt-4 text-sm", softTextClass)}>
                {apiStatusMeta[apiStatus].helper}
              </p>

              <div className="mt-5 space-y-3">
                <div className={cn("rounded-xl border p-4", subtlePanelClass)}>
                  <p
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-[0.14em]",
                      softTextClass,
                    )}
                  >
                    Phone number
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-sm font-semibold",
                      strongTextClass,
                    )}
                  >
                    {workspaceState?.api.phoneNumber || "Not connected yet"}
                  </p>
                </div>

                <div className={cn("rounded-xl border p-4", subtlePanelClass)}>
                  <p
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-[0.14em]",
                      softTextClass,
                    )}
                  >
                    Messaging limits
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-sm font-semibold",
                      strongTextClass,
                    )}
                  >
                    {workspaceState?.api.messagingLimit ||
                      "Will appear after setup is approved"}
                  </p>
                </div>

                <div className={cn("rounded-xl border p-4", subtlePanelClass)}>
                  <p
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-[0.14em]",
                      softTextClass,
                    )}
                  >
                    Upgrade path
                  </p>
                  <p className={cn("mt-1 text-sm", softTextClass)}>
                    Users can run on QR, API, or both. Start fast with QR, then
                    scale into the Official API.
                  </p>
                </div>
              </div>

              <Button asChild className="mt-5 w-full">
                <Link to="/whatsapp/setup">
                  {apiStatus === "none" ? "Start API setup" : "Open API setup"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <Card className={shellPanelClass}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className={cn(
                      "text-[11px] font-semibold uppercase tracking-[0.14em]",
                      softTextClass,
                    )}
                  >
                    Jennifer status
                  </p>
                  <h3
                    className={cn(
                      "mt-1 text-lg font-black tracking-tight",
                      strongTextClass,
                    )}
                  >
                    Activate Jennifer (AI Auto-Reply)
                  </h3>
                  <p className={cn("mt-2 max-w-2xl text-sm", softTextClass)}>
                    When a message hits n8n, the workflow can check this
                    database field first. If it is disabled, Jennifer stays
                    silent.
                  </p>
                </div>

                <Switch
                  checked={workspaceState?.isAiActive ?? false}
                  disabled={isUpdatingJennifer || isLoading}
                  onCheckedChange={handleJenniferToggle}
                />
              </div>

              <div
                className={cn("mt-5 rounded-xl border p-4", subtlePanelClass)}
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
            </CardContent>
          </Card>

          <Card className={shellPanelClass}>
            <CardContent className="p-6">
              <p
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.14em]",
                  softTextClass,
                )}
              >
                Integration notes
              </p>
              <h3
                className={cn(
                  "mt-1 text-lg font-black tracking-tight",
                  strongTextClass,
                )}
              >
                Mock connection flow
              </h3>
              <div className={cn("mt-4 space-y-3 text-sm", softTextClass)}>
                <p>
                  1. Generate QR starts a mock Evolution session for the
                  workspace.
                </p>
                <p>2. A placeholder QR image is rendered immediately.</p>
                <p>
                  3. While pending, the page polls every 5 seconds and simulates
                  a connection.
                </p>
                <p>
                  4. The latest QR state is still persisted so refreshes stay
                  consistent.
                </p>
              </div>
              <Button
                asChild
                className={cn("mt-5 w-full", outlineButtonClass)}
                variant="outline"
              >
                <Link to="/whatsapp/setup">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open API setup
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </UserLayout>
  );
}
