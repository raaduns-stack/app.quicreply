import { type AuthUser } from "wasp/auth";
import { useEffect, useMemo, useState } from "react";
import {
  createCampaign as createCampaignOperation,
  getCampaigns,
  getWhatsAppWorkspaceState,
  useQuery,
} from "wasp/client/operations";
import UserLayout from "./layout/UserLayout";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Megaphone,
  MessageSquareText,
  Rocket,
  RotateCcw,
  Save,
  Search,
  Send,
  X,
} from "lucide-react";
import { Button } from "../client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../client/components/ui/dialog";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { Textarea } from "../client/components/ui/textarea";
import { useToast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";

interface Campaign {
  id: string;
  name: string;
  subtitle: string;
  message: string;
  audience: number;
  status: "sent" | "sending" | "queued" | "draft" | "failed";
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  createdDate: string;
}

type CampaignDraft = {
  name: string;
  subtitle: string;
  message: string;
  type: "Promotional" | "Transactional" | "Update";
  audience: "allContacts";
  scheduleType: "now" | "later";
  scheduleDate: string;
  scheduleTime: string;
};

const EMPTY_CAMPAIGN_DRAFT: CampaignDraft = {
  name: "",
  subtitle: "",
  message: "",
  type: "Promotional",
  audience: "allContacts",
  scheduleType: "now",
  scheduleDate: "",
  scheduleTime: "",
};

const formFieldClass =
  "h-10 rounded-lg border-[#e8e2d8] bg-white text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-[#fe901d] focus-visible:ring-[#fe901d] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-100 dark:placeholder:text-slate-500";

const formLabelClass =
  "text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400";

function WhatsAppMessagePreview({ message }: { message: string }) {
  const displayMessage = message.trim();

  return (
    <div
      className="min-h-[250px] overflow-hidden rounded-xl bg-[#e5ddd5] p-4"
      style={{
        backgroundImage:
          "radial-gradient(circle at 3px 3px, rgba(5,150,105,.05) 0 3px, transparent 3px), radial-gradient(circle at 13px 13px, rgba(5,150,105,.05) 0 3px, transparent 3px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div className="ml-auto max-w-[90%] whitespace-pre-wrap rounded-xl rounded-tr-sm bg-[#dcf8c6] p-3 text-[13px] leading-relaxed text-gray-800 shadow-sm">
        {displayMessage || (
          <span className="italic text-gray-500">
            Type a message to see preview...
          </span>
        )}
      </div>
      <div className="ml-auto mt-1 flex w-fit items-center gap-1 pr-1 text-[10px] font-medium text-gray-500">
        10:42 AM
        <span className="text-blue-500">✓✓</span>
      </div>
    </div>
  );
}

const CampaignsPage = ({ user }: { user: AuthUser }) => {
  const { toast } = useToast();
  const campaignsQuery = useQuery(getCampaigns);
  const workspaceStateQuery = useQuery(getWhatsAppWorkspaceState);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isPanelClosing, setIsPanelClosing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isLaunchOpen, setIsLaunchOpen] = useState(false);
  const [isSavingCampaign, setIsSavingCampaign] = useState(false);
  const [draft, setDraft] = useState<CampaignDraft>(EMPTY_CAMPAIGN_DRAFT);
  const [draftError, setDraftError] = useState("");
  const [dateRange] = useState({
    start: "May 1, 2026",
    end: "May 31, 2026",
  });

  useEffect(() => {
    if (campaignsQuery.data) {
      setCampaigns(campaignsQuery.data as Campaign[]);
    }
  }, [campaignsQuery.data]);

  const workspaceState = workspaceStateQuery.data as
    | {
        whatsappMode: "qr" | "api" | "both";
        api: { status: "none" | "pending" | "approved" };
      }
    | undefined;
  const isQrOnly =
    workspaceState?.whatsappMode !== "api" ||
    workspaceState?.api.status !== "approved";

  const filteredCampaigns = campaigns.filter((campaign) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      campaign.name.toLowerCase().includes(query) ||
      campaign.subtitle.toLowerCase().includes(query) ||
      campaign.message.toLowerCase().includes(query);
    const matchesStatus =
      statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedCampaign =
    selectedCampaignId !== null
      ? filteredCampaigns.find((campaign) => campaign.id === selectedCampaignId)
      : null;

  const openCampaignPanel = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setIsPanelClosing(false);
    setIsPanelOpen(true);
  };

  const closeCampaignPanel = () => {
    setIsPanelClosing(true);
    window.setTimeout(() => {
      setIsPanelOpen(false);
      setIsPanelClosing(false);
      setSelectedCampaignId(null);
    }, 180);
  };

  const totals = useMemo(
    () => ({
      total: campaigns.length,
      drafts: campaigns.filter((campaign) => campaign.status === "draft")
        .length,
      sent: campaigns.reduce((sum, campaign) => sum + campaign.sent, 0),
      delivered: campaigns.reduce(
        (sum, campaign) => sum + campaign.delivered,
        0,
      ),
    }),
    [campaigns],
  );

  const getStatusStyles = (status: Campaign["status"]) => {
    switch (status) {
      case "sent":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300";
      case "sending":
        return "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300";
      case "queued":
        return "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300";
      case "draft":
        return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300";
      case "failed":
        return "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300";
    }
  };

  const getStatusLabel = (status: Campaign["status"]) => {
    const labels = {
      sent: "Sent",
      sending: "Sending",
      queued: "Queued",
      draft: "Draft",
      failed: "Failed",
    };
    return labels[status];
  };

  function openCreateDialog() {
    setDraft(EMPTY_CAMPAIGN_DRAFT);
    setDraftError("");
    setIsCreateOpen(true);
  }

  function insertVariable(variable: string) {
    setDraft((current) => ({
      ...current,
      message: `${current.message}${current.message ? " " : ""}${variable}`,
    }));
  }

  async function saveCampaign(options?: { stayOnPage?: boolean }) {
    if (!draft.name.trim() || !draft.message.trim()) {
      setDraftError("Campaign name and message are required.");
      return null;
    }

    setIsSavingCampaign(true);
    setDraftError("");

    try {
      const createdCampaign = (await createCampaignOperation({
        name: draft.name.trim(),
        subtitle: draft.subtitle.trim() || draft.type,
        message: draft.message.trim(),
        audience: draft.audience,
      })) as Campaign;
      setCampaigns((current) => [createdCampaign, ...current]);
      if (!options?.stayOnPage) {
        setIsCreateOpen(false);
      }
      toast({
        title: "Campaign draft saved",
        description: "Audience was snapshotted from your current contacts.",
      });
      return createdCampaign;
    } catch (err: any) {
      setDraftError(err?.message || "Could not save campaign.");
      return null;
    } finally {
      setIsSavingCampaign(false);
    }
  }

  async function handleLaunchRequest() {
    if (isQrOnly) {
      setIsUpgradeOpen(true);
      return;
    }

    if (!draft.name.trim() || !draft.message.trim()) {
      setDraftError("Campaign name and message are required.");
      return;
    }

    setIsLaunchOpen(true);
  }

  if (isCreateOpen) {
    return (
      <UserLayout user={user}>
        <div className="w-full space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Button
                  className="h-8 w-8 cursor-pointer rounded-lg p-0"
                  onClick={() => setIsCreateOpen(false)}
                  variant="ghost"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#182235] dark:text-white">
                  Create Campaign
                </h1>
              </div>
              <p className="pl-10 text-sm font-medium text-slate-500 dark:text-slate-400">
                Build and schedule a WhatsApp broadcast campaign
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="cursor-pointer gap-1.5"
                disabled={isSavingCampaign}
                onClick={() => saveCampaign({ stayOnPage: true })}
                variant="outline"
              >
                {isSavingCampaign ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Draft
              </Button>
              <Button
                className="cursor-pointer gap-1.5"
                onClick={() => setIsPreviewOpen(true)}
                variant="outline"
              >
                <Eye className="h-4 w-4" />
                Preview Campaign
              </Button>
              <Button
                className="cursor-pointer gap-1.5"
                onClick={handleLaunchRequest}
              >
                <Rocket className="h-4 w-4" />
                Launch Campaign
              </Button>
            </div>
          </div>

          {isQrOnly && (
            <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center dark:border-amber-400/20 dark:bg-amber-400/10">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                  QR mode has limited sending. Upgrade to Official API for bulk
                  campaigns.
                </p>
              </div>
              <Button
                asChild
                className="cursor-pointer border-amber-700 bg-amber-600 text-white hover:bg-amber-700"
              >
                <a href="/whatsapp/setup">Upgrade to API</a>
              </Button>
            </div>
          )}

          {draftError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
              {draftError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-6">
              <section className="rounded-2xl border border-[#e8e2d8] bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0d1524]">
                <h2 className="mb-5 flex items-center gap-2 font-bold text-[#182235] dark:text-white">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    1
                  </span>
                  Campaign Details
                </h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className={formLabelClass}>Campaign Name</Label>
                    <Input
                      className={formFieldClass}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="e.g., Summer Promo 2026"
                      value={draft.name}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className={formLabelClass}>Campaign Type</Label>
                      <select
                        className={cn(formFieldClass, "w-full cursor-pointer")}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            type: event.target.value as CampaignDraft["type"],
                          }))
                        }
                        value={draft.type}
                      >
                        <option>Promotional</option>
                        <option>Transactional</option>
                        <option>Update</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className={formLabelClass}>
                        Audience Selection
                      </Label>
                      <select
                        className={cn(formFieldClass, "w-full cursor-pointer")}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            audience: event.target
                              .value as CampaignDraft["audience"],
                          }))
                        }
                        value={draft.audience}
                      >
                        <option value="allContacts">All Contacts</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e8e2d8] bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0d1524]">
                <h2 className="mb-5 flex items-center gap-2 font-bold text-[#182235] dark:text-white">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    2
                  </span>
                  Message Content
                </h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className={formLabelClass}>Message</Label>
                    <Textarea
                      className="h-32 resize-y rounded-lg border-[#e8e2d8] bg-white text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-[#fe901d] focus-visible:ring-[#fe901d] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-100 dark:placeholder:text-slate-500"
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          message: event.target.value,
                        }))
                      }
                      placeholder="Type your broadcast message..."
                      value={draft.message}
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Insert variables:
                      </span>
                      {["{{name}}", "{{business}}", "{{offer}}"].map(
                        (variable) => (
                          <button
                            className="cursor-pointer rounded-md border border-[#e8e2d8] bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"
                            key={variable}
                            onClick={() => insertVariable(variable)}
                            type="button"
                          >
                            {variable}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e8e2d8] bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0d1524]">
                <h2 className="mb-5 flex items-center gap-2 font-bold text-[#182235] dark:text-white">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    3
                  </span>
                  Delivery Settings
                </h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className={formLabelClass}>Send Schedule</Label>
                    <select
                      className={cn(
                        formFieldClass,
                        "w-full cursor-pointer sm:w-1/2",
                      )}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          scheduleType: event.target
                            .value as CampaignDraft["scheduleType"],
                        }))
                      }
                      value={draft.scheduleType}
                    >
                      <option value="now">Send now</option>
                      <option value="later">Schedule later</option>
                    </select>
                  </div>
                  {draft.scheduleType === "later" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className={formLabelClass}>Date</Label>
                        <Input
                          className={formFieldClass}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              scheduleDate: event.target.value,
                            }))
                          }
                          type="date"
                          value={draft.scheduleDate}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className={formLabelClass}>Time</Label>
                        <Input
                          className={formFieldClass}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              scheduleTime: event.target.value,
                            }))
                          }
                          type="time"
                          value={draft.scheduleTime}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <aside>
              <div className="sticky top-24 rounded-2xl border border-[#e8e2d8] bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0d1524]">
                <h2 className="mb-4 text-center font-bold text-[#182235] dark:text-white">
                  Message Preview
                </h2>
                <WhatsAppMessagePreview message={draft.message} />
              </div>
            </aside>
          </div>
        </div>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="border-[#e8e2d8] bg-white dark:border-white/10 dark:bg-[#0d1524] sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Campaign Preview</DialogTitle>
            </DialogHeader>
            <WhatsAppMessagePreview message={draft.message} />
            <DialogFooter>
              <Button
                className="w-full cursor-pointer"
                onClick={() => setIsPreviewOpen(false)}
              >
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
          <DialogContent className="border-[#e8e2d8] bg-white text-center dark:border-white/10 dark:bg-[#0d1524] sm:max-w-sm">
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <DialogTitle>Upgrade Required</DialogTitle>
              <DialogDescription>
                Upgrade to Official API before sending bulk campaigns.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-center">
              <Button
                className="cursor-pointer"
                onClick={() => setIsUpgradeOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button className="cursor-pointer" asChild>
                <a href="/whatsapp/setup">Upgrade Now</a>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isLaunchOpen} onOpenChange={setIsLaunchOpen}>
          <DialogContent className="border-[#e8e2d8] bg-white text-center dark:border-white/10 dark:bg-[#0d1524] sm:max-w-sm">
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#fe901d]/20 bg-[#fe901d]/10 text-[#fe901d]">
                <Rocket className="h-7 w-7" />
              </div>
              <DialogTitle>Launch Campaign?</DialogTitle>
              <DialogDescription>
                Sending is not enabled yet. Save this campaign as a draft now,
                then connect the sending flow next.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-center">
              <Button
                className="cursor-pointer"
                onClick={() => setIsLaunchOpen(false)}
                variant="outline"
              >
                Review First
              </Button>
              <Button
                className="cursor-pointer"
                disabled={isSavingCampaign}
                onClick={async () => {
                  const created = await saveCampaign();
                  if (created) {
                    setIsLaunchOpen(false);
                  }
                }}
              >
                Save Draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </UserLayout>
    );
  }

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">
              Campaigns
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Send and manage broadcast messages
            </p>
          </div>
          <Button className="gap-1.5" onClick={openCreateDialog}>
            <Megaphone className="h-4 w-4" />
            Create Campaign
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Total Campaigns", value: totals.total },
            { label: "Drafts", value: totals.drafts },
            { label: "Sent Messages", value: totals.sent },
            { label: "Delivered", value: totals.delivered },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-[#e8e2d8] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#0d1524]"
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {item.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-[#182235] dark:text-white">
                {item.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#0d1524]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="sending">Sending</option>
              <option value="queued">Queued</option>
              <option value="draft">Draft</option>
              <option value="failed">Failed</option>
            </select>
            <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
              <Calendar className="h-4 w-4" />
              {dateRange.start} - {dateRange.end}
            </button>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#0d1524]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">
                <tr>
                  <th className="w-8 px-4 py-3">
                    <input type="checkbox" className="rounded" />
                  </th>
                  {[
                    "Campaign Name",
                    "Message Preview",
                    "Audience",
                    "Status",
                    "Sent",
                    "Delivered",
                    "Created Date",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-3 text-left text-sm font-semibold text-foreground dark:text-white"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaignsQuery.isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-[#fe901d]" />
                        <p className="text-sm font-medium text-muted-foreground">
                          Loading campaigns
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-muted">
                          <MessageSquareText className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          No campaigns yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Create your first broadcast draft from real contact
                          data.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      onClick={() => {
                        openCampaignPanel(campaign.id);
                      }}
                      className="cursor-pointer border-b border-gray-200 transition-colors hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="rounded"
                          onClick={(event) => event.stopPropagation()}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fe901d]/10 text-[#fe901d]">
                            <Megaphone className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground dark:text-white">
                              {campaign.name}
                            </p>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">
                              {campaign.subtitle}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-xs px-6 py-3 text-sm text-muted-foreground dark:text-gray-400">
                        <p className="truncate">{campaign.message}</p>
                      </td>
                      <td className="px-6 py-3 text-sm text-foreground dark:text-white">
                        {campaign.audience.toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
                            getStatusStyles(campaign.status),
                          )}
                        >
                          {campaign.status === "sending" && (
                            <span className="animate-pulse">•</span>
                          )}
                          {getStatusLabel(campaign.status)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-foreground dark:text-white">
                        {campaign.sent.toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-sm text-foreground dark:text-white">
                          {campaign.delivered.toLocaleString()}
                          <span className="ml-1 text-xs text-muted-foreground dark:text-gray-400">
                            {campaign.deliveryRate > 0 &&
                              `${campaign.deliveryRate}%`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-foreground dark:text-white">
                        {campaign.createdDate}
                      </td>
                      <td className="px-6 py-3">
                        <button className="text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white">
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-[#0d1524]">
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            Showing {filteredCampaigns.length} of {campaigns.length} campaigns
          </p>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-gray-200 p-2 opacity-50 dark:border-white/10">
              <ChevronLeft className="h-4 w-4 text-foreground dark:text-white" />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fe901d] text-sm font-medium text-white">
              1
            </button>
            <button className="rounded-lg border border-gray-200 p-2 opacity-50 dark:border-white/10">
              <ChevronRight className="h-4 w-4 text-foreground dark:text-white" />
            </button>
          </div>
        </div>

        {isPanelOpen && selectedCampaign && (
          <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
            <div
              className={cn(
                "pointer-events-auto absolute bottom-0 right-0 top-0 w-full max-w-md border-l border-[#e8e2d8] bg-white shadow-xl dark:border-white/10 dark:bg-[#0d1524]",
                isPanelClosing
                  ? "animate-out slide-out-to-right duration-200"
                  : "animate-in slide-in-from-right duration-200",
              )}
            >
              <div className="border-b border-gray-200 px-6 py-4 dark:border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground dark:text-white">
                      {selectedCampaign.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedCampaign.subtitle}
                    </p>
                  </div>
                  <button
                    aria-label="Close campaign details"
                    onClick={closeCampaignPanel}
                    className="cursor-pointer text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-5 overflow-y-auto px-6 py-5">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Message Preview
                  </p>
                  <div className="rounded-lg border border-[#e8e2d8] bg-[#f7f8fa] p-4 dark:border-white/10 dark:bg-[#0b1324]">
                    <p className="text-sm text-foreground dark:text-slate-100">
                      {selectedCampaign.message}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Audience", selectedCampaign.audience],
                    ["Sent", selectedCampaign.sent],
                    ["Delivered", selectedCampaign.delivered],
                    ["Failed", selectedCampaign.failed],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5"
                    >
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 text-lg font-bold text-foreground dark:text-white">
                        {Number(value).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
                <Button disabled className="w-full gap-1.5">
                  <Send className="h-4 w-4" />
                  Sending flow coming next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default CampaignsPage;
