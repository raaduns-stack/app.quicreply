import { type AuthUser } from "wasp/auth";
import { useEffect, useMemo, useState } from "react";
import {
  createCampaign as createCampaignOperation,
  getCampaignDetail,
  estimateCampaignAudience,
  getContacts,
  getCampaigns,
  getCampaignPreview,
  getPipelineState,
  getWhatsAppWorkspaceState,
  launchCampaign as launchCampaignOperation,
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
  Image as ImageIcon,
  Loader2,
  Megaphone,
  MessageSquareText,
  Rocket,
  RotateCcw,
  Save,
  Search,
  Send,
  Users,
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
  mediaUrl: string | null;
  mediaType: string | null;
  useApprovedTemplate: boolean;
  templateName: string | null;
  templateLanguage: string | null;
  enableJenniferReplies: boolean;
  campaignContext: string | null;
  audience: number;
  status: "sent" | "sending" | "queued" | "draft" | "failed";
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  createdDate: string;
}

type ContactOption = {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  avi: string;
  color: string;
};

type PipelineStage = {
  id: string;
  name: string;
  count: number;
};

type PipelineState = {
  stages: PipelineStage[];
};

type AudienceMode = "allContacts" | "tags" | "pipelineStages" | "manual";

type CampaignDraft = {
  name: string;
  subtitle: string;
  message: string;
  type: "Promotional" | "Transactional" | "Update";
  audienceMode: AudienceMode;
  selectedTags: string[];
  selectedStageIds: string[];
  selectedContactIds: string[];
  mediaUrl: string;
  useApprovedTemplate: boolean;
  templateName: string;
  templateLanguage: string;
  enableJenniferReplies: boolean;
  campaignContext: string;
  scheduleType: "now" | "later";
  scheduleDate: string;
  scheduleTime: string;
};

const EMPTY_CAMPAIGN_DRAFT: CampaignDraft = {
  name: "",
  subtitle: "",
  message: "",
  type: "Promotional",
  audienceMode: "allContacts",
  selectedTags: [],
  selectedStageIds: [],
  selectedContactIds: [],
  mediaUrl: "",
  useApprovedTemplate: false,
  templateName: "",
  templateLanguage: "en",
  enableJenniferReplies: false,
  campaignContext: "",
  scheduleType: "now",
  scheduleDate: "",
  scheduleTime: "",
};

const formFieldClass =
  "h-10 rounded-lg border-[#e8e2d8] bg-white text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-[#fe901d] focus-visible:ring-[#fe901d] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-100 dark:placeholder:text-slate-500";

const formLabelClass =
  "text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400";

function buildAudiencePayload(draft: CampaignDraft) {
  return {
    mode: draft.audienceMode,
    tags: draft.selectedTags,
    stageIds: draft.selectedStageIds,
    contactIds: draft.selectedContactIds,
  };
}

function getAudienceModeLabel(mode: AudienceMode) {
  switch (mode) {
    case "allContacts":
      return "All Contacts";
    case "tags":
      return "By Tag";
    case "pipelineStages":
      return "By Pipeline Stage";
    case "manual":
      return "Manual Picker";
  }
}

function getMediaTypeFromUrl(url: string) {
  const normalizedUrl = url.trim().toLowerCase();
  if (!normalizedUrl) {
    return "";
  }

  if (
    normalizedUrl.endsWith(".png") ||
    normalizedUrl.endsWith(".jpg") ||
    normalizedUrl.endsWith(".jpeg") ||
    normalizedUrl.endsWith(".gif") ||
    normalizedUrl.endsWith(".webp")
  ) {
    return "image";
  }

  return "link";
}

function WhatsAppMessagePreview({
  message,
  sampleContactName,
  sampleLastAction,
}: {
  message: string;
  sampleContactName?: string | null;
  sampleLastAction?: string | null;
}) {
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
      {(sampleContactName || sampleLastAction) && (
        <div className="mt-4 rounded-lg bg-white/75 px-3 py-2 text-[11px] text-slate-600">
          <p className="font-semibold text-slate-700">
            Sample recipient{sampleContactName ? `: ${sampleContactName}` : ""}
          </p>
          {sampleLastAction ? <p className="mt-1">Last action: {sampleLastAction}</p> : null}
        </div>
      )}
    </div>
  );
}

const CampaignsPage = ({ user }: { user: AuthUser }) => {
  const { toast } = useToast();
  const campaignsQuery = useQuery(getCampaigns);
  const contactsQuery = useQuery(getContacts, {});
  const pipelineQuery = useQuery(getPipelineState);
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
  const [isLaunchingCampaign, setIsLaunchingCampaign] = useState(false);
  const [draft, setDraft] = useState<CampaignDraft>(EMPTY_CAMPAIGN_DRAFT);
  const [draftError, setDraftError] = useState("");
  const [manualAudienceSearch, setManualAudienceSearch] = useState("");
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
  const selectedCampaignDetailQuery = useQuery(
    getCampaignDetail,
    selectedCampaignId ? { campaignId: selectedCampaignId } : undefined,
    { enabled: Boolean(selectedCampaignId && isPanelOpen) },
  );
  const selectedCampaignDetail = selectedCampaignDetailQuery.data as
    | (Campaign & {
        recipientCount: number;
        queuedRecipients: number;
        deliveredRecipients: number;
        failedRecipients: number;
        latestEventType: string | null;
        events: Array<{
          id: string;
          eventType: string;
          createdAt: string;
          summary: string;
          payloadPreview: string | null;
        }>;
      })
    | undefined;
  const contacts = (contactsQuery.data as ContactOption[] | undefined) ?? [];
  const pipeline = pipelineQuery.data as PipelineState | undefined;
  const pipelineStages = pipeline?.stages ?? [];
  const availableTags = useMemo(() => {
    return Array.from(
      new Set(contacts.flatMap((contact) => contact.tags).map((tag) => tag.trim()).filter(Boolean)),
    ).sort((left, right) => left.localeCompare(right));
  }, [contacts]);
  const filteredManualContacts = useMemo(() => {
    const query = manualAudienceSearch.trim().toLowerCase();
    if (!query) {
      return contacts;
    }

    return contacts.filter((contact) => {
      return (
        contact.name.toLowerCase().includes(query) ||
        contact.phone.toLowerCase().includes(query) ||
        contact.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [contacts, manualAudienceSearch]);
  const audienceEstimateArgs = useMemo(
    () => ({
      audience: buildAudiencePayload(draft),
    }),
    [
      draft.audienceMode,
      draft.selectedContactIds,
      draft.selectedStageIds,
      draft.selectedTags,
    ],
  );
  const audienceEstimateQuery = useQuery(
    estimateCampaignAudience,
    audienceEstimateArgs,
    { enabled: isCreateOpen },
  );
  const campaignPreviewQuery = useQuery(
    getCampaignPreview,
    {
      message: draft.message,
      audience: buildAudiencePayload(draft),
    },
    { enabled: isCreateOpen },
  );
  const audienceEstimate = (audienceEstimateQuery.data as
    | {
        count: number;
        contactIds: string[];
      }
    | undefined) ?? {
    count: 0,
    contactIds: [],
  };
  const campaignPreview = (campaignPreviewQuery.data as
    | {
        renderedMessage: string;
        sampleContactName: string | null;
        sampleContactPhone: string | null;
        sampleLastAction: string | null;
      }
    | undefined) ?? {
    renderedMessage: draft.message,
    sampleContactName: null,
    sampleContactPhone: null,
    sampleLastAction: null,
  };

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
    setManualAudienceSearch("");
    setIsCreateOpen(true);
  }

  function insertVariable(variable: string) {
    setDraft((current) => ({
      ...current,
      message: `${current.message}${current.message ? " " : ""}${variable}`,
    }));
  }

  async function saveCampaign(options?: {
    stayOnPage?: boolean;
    suppressToast?: boolean;
  }) {
    if (!draft.name.trim() || !draft.message.trim()) {
      setDraftError("Campaign name and message are required.");
      return null;
    }

    if (
      draft.useApprovedTemplate &&
      (!draft.templateName.trim() || !draft.templateLanguage.trim())
    ) {
      setDraftError(
        "Template name and language are required when approved template mode is enabled.",
      );
      return null;
    }

    if (audienceEstimate.count === 0) {
      setDraftError("Select at least one valid recipient before saving.");
      return null;
    }

    setIsSavingCampaign(true);
    setDraftError("");

    try {
      const createdCampaign = (await createCampaignOperation({
        name: draft.name.trim(),
        subtitle: draft.subtitle.trim() || draft.type,
        message: draft.message.trim(),
        mediaUrl: draft.mediaUrl.trim(),
        mediaType: getMediaTypeFromUrl(draft.mediaUrl),
        useApprovedTemplate: draft.useApprovedTemplate,
        templateName: draft.templateName.trim(),
        templateLanguage: draft.templateLanguage.trim(),
        enableJenniferReplies: draft.enableJenniferReplies,
        campaignContext: draft.campaignContext.trim(),
        audience: buildAudiencePayload(draft),
      })) as Campaign;
      setCampaigns((current) => [createdCampaign, ...current]);
      if (!options?.stayOnPage) {
        setIsCreateOpen(false);
      }
      if (!options?.suppressToast) {
        toast({
          title: "Campaign draft saved",
          description: `Audience snapshotted with ${audienceEstimate.count.toLocaleString()} recipients.`,
        });
      }
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

    if (
      draft.useApprovedTemplate &&
      (!draft.templateName.trim() || !draft.templateLanguage.trim())
    ) {
      setDraftError(
        "Template name and language are required when approved template mode is enabled.",
      );
      return;
    }

    if (audienceEstimate.count === 0) {
      setDraftError("Select at least one valid recipient before launching.");
      return;
    }

    setIsLaunchOpen(true);
  }

  async function queueCampaign() {
    setIsLaunchingCampaign(true);
    setDraftError("");

    try {
      const createdCampaign = await saveCampaign({
        stayOnPage: true,
        suppressToast: true,
      });
      if (!createdCampaign) {
        return;
      }

      const launchResult = (await launchCampaignOperation({
        campaignId: createdCampaign.id,
      })) as {
        campaign: Campaign;
        handoff: {
          attempted: boolean;
          delivered: boolean;
          reason: string;
        };
      };
      const queuedCampaign = launchResult.campaign;

      setCampaigns((current) => {
        const existing = current.some((campaign) => campaign.id === queuedCampaign.id);
        if (!existing) {
          return [queuedCampaign, ...current];
        }

        return current.map((campaign) =>
          campaign.id === queuedCampaign.id ? queuedCampaign : campaign,
        );
      });

      setIsLaunchOpen(false);
      setIsCreateOpen(false);
      toast({
        title: launchResult.handoff.delivered
          ? "Campaign queued and handed to n8n"
          : "Campaign queued",
        description: launchResult.handoff.delivered
          ? "The launch payload was delivered to n8n."
          : launchResult.handoff.attempted
            ? "Queueing succeeded, but n8n handoff failed. Review the campaign status."
            : "The launch payload is stored locally and ready once the n8n campaign webhook is configured.",
      });
    } catch (err: any) {
      setDraftError(err?.message || "Could not queue campaign.");
    } finally {
      setIsLaunchingCampaign(false);
    }
  }

  function toggleTag(tag: string) {
    setDraft((current) => ({
      ...current,
      audienceMode: "tags",
      selectedTags: current.selectedTags.includes(tag)
        ? current.selectedTags.filter((value) => value !== tag)
        : [...current.selectedTags, tag],
    }));
  }

  function toggleStage(stageId: string) {
    setDraft((current) => ({
      ...current,
      audienceMode: "pipelineStages",
      selectedStageIds: current.selectedStageIds.includes(stageId)
        ? current.selectedStageIds.filter((value) => value !== stageId)
        : [...current.selectedStageIds, stageId],
    }));
  }

  function toggleManualContact(contactId: string) {
    setDraft((current) => ({
      ...current,
      audienceMode: "manual",
      selectedContactIds: current.selectedContactIds.includes(contactId)
        ? current.selectedContactIds.filter((value) => value !== contactId)
        : [...current.selectedContactIds, contactId],
    }));
  }

  const audienceSummary = useMemo(() => {
    switch (draft.audienceMode) {
      case "allContacts":
        return "All current CRM contacts";
      case "tags":
        return draft.selectedTags.length > 0
          ? `${draft.selectedTags.length} tag filter${draft.selectedTags.length === 1 ? "" : "s"} selected`
          : "No tags selected yet";
      case "pipelineStages":
        return draft.selectedStageIds.length > 0
          ? `${draft.selectedStageIds.length} pipeline stage${draft.selectedStageIds.length === 1 ? "" : "s"} selected`
          : "No pipeline stages selected yet";
      case "manual":
        return draft.selectedContactIds.length > 0
          ? `${draft.selectedContactIds.length} contacts selected manually`
          : "No contacts selected yet";
    }
  }, [
    draft.audienceMode,
    draft.selectedContactIds.length,
    draft.selectedStageIds.length,
    draft.selectedTags.length,
  ]);

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
                    <div className="rounded-xl border border-[#e8e2d8] bg-[#f7f8fa] p-4 dark:border-white/10 dark:bg-[#0b1324]">
                      <p className={formLabelClass}>Audience Size</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#fe901d]" />
                        <span className="text-2xl font-bold text-[#182235] dark:text-white">
                          {audienceEstimateQuery.isLoading
                            ? "..."
                            : audienceEstimate.count.toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {audienceSummary}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e8e2d8] bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0d1524]">
                <h2 className="mb-5 flex items-center gap-2 font-bold text-[#182235] dark:text-white">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    2
                  </span>
                  Audience Selection
                </h2>

                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {(
                      [
                        "allContacts",
                        "tags",
                        "pipelineStages",
                        "manual",
                      ] as const
                    ).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            audienceMode: mode,
                          }))
                        }
                        className={cn(
                          "rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
                          draft.audienceMode === mode
                            ? "border-[#fe901d] bg-[#fff5ea] text-[#c96a00] dark:border-[#fe901d] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]"
                            : "border-[#e8e2d8] bg-white text-slate-600 hover:border-[#f3d2a5] hover:bg-[#fffaf3] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-300 dark:hover:bg-white/5",
                        )}
                      >
                        {getAudienceModeLabel(mode)}
                      </button>
                    ))}
                  </div>

                  {draft.audienceMode === "allContacts" && (
                    <div className="rounded-xl border border-dashed border-[#e8e2d8] bg-[#faf8f4] px-4 py-4 text-sm text-slate-600 dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-300">
                      This campaign will target every contact currently stored in CRM.
                    </div>
                  )}

                  {draft.audienceMode === "tags" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {availableTags.length > 0 ? (
                          availableTags.map((tag) => {
                            const isSelected = draft.selectedTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={cn(
                                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                                  isSelected
                                    ? "border-[#fe901d] bg-[#fff5ea] text-[#c96a00] dark:border-[#fe901d] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]"
                                    : "border-[#e8e2d8] bg-white text-slate-600 hover:border-[#f3d2a5] hover:bg-[#fffaf3] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-300 dark:hover:bg-white/5",
                                )}
                              >
                                #{tag}
                              </button>
                            );
                          })
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            No contact tags exist yet.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {draft.audienceMode === "pipelineStages" && (
                    <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {pipelineStages.length > 0 ? (
                          pipelineStages.map((stage) => {
                            const isSelected = draft.selectedStageIds.includes(stage.id);
                            return (
                              <button
                                key={stage.id}
                                type="button"
                                onClick={() => toggleStage(stage.id)}
                                className={cn(
                                  "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                                  isSelected
                                    ? "border-[#fe901d] bg-[#fff5ea] text-[#c96a00] dark:border-[#fe901d] dark:bg-[#fe901d]/10 dark:text-[#ffb84d]"
                                    : "border-[#e8e2d8] bg-white text-slate-600 hover:border-[#f3d2a5] hover:bg-[#fffaf3] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-300 dark:hover:bg-white/5",
                                )}
                              >
                                <span>{stage.name}</span>
                                <span className="text-xs opacity-70">
                                  {stage.count} deals
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            No pipeline stages are available yet.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {draft.audienceMode === "manual" && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search contacts by name, phone, or tag..."
                          value={manualAudienceSearch}
                          onChange={(event) => setManualAudienceSearch(event.target.value)}
                          className="w-full rounded-lg border border-[#e8e2d8] bg-white py-2.5 pl-10 pr-4 text-sm text-foreground dark:border-white/10 dark:bg-[#0b1324] dark:text-white"
                        />
                      </div>

                      <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-[#e8e2d8] bg-[#faf8f4] p-3 dark:border-white/10 dark:bg-[#0b1324]">
                        {filteredManualContacts.length > 0 ? (
                          filteredManualContacts.map((contact) => {
                            const isSelected = draft.selectedContactIds.includes(contact.id);
                            return (
                              <label
                                key={contact.id}
                                className={cn(
                                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors",
                                  isSelected
                                    ? "border-[#fe901d] bg-[#fff5ea] dark:border-[#fe901d] dark:bg-[#fe901d]/10"
                                    : "border-transparent bg-white hover:border-[#f3d2a5] dark:bg-[#101827] dark:hover:border-white/10",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleManualContact(contact.id)}
                                  className="mt-1 rounded"
                                />
                                <div
                                  className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                                  style={{ background: contact.color }}
                                >
                                  {contact.avi}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[#182235] dark:text-white">
                                    {contact.name}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {contact.phone}
                                  </p>
                                  {contact.tags.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {contact.tags.slice(0, 3).map((tag) => (
                                        <span
                                          key={`${contact.id}-${tag}`}
                                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300"
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </label>
                            );
                          })
                        ) : (
                          <p className="px-2 py-4 text-sm text-slate-500 dark:text-slate-400">
                            No contacts match this search.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-[#e8e2d8] bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0d1524]">
                <h2 className="mb-5 flex items-center gap-2 font-bold text-[#182235] dark:text-white">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    3
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
                      {["{{first_name}}", "{{last_action}}"].map(
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
                    4
                  </span>
                  Delivery Settings
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className={formLabelClass}>Media URL</Label>
                      <Input
                        className={formFieldClass}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            mediaUrl: event.target.value,
                          }))
                        }
                        placeholder="https://example.com/promo-image.jpg"
                        value={draft.mediaUrl}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Save the asset reference now. Direct upload can sit on top of this later.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className={formLabelClass}>Media Preview</Label>
                      <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[#e8e2d8] bg-[#faf8f4] p-3 dark:border-white/10 dark:bg-[#0b1324]">
                        {draft.mediaUrl.trim() ? (
                          getMediaTypeFromUrl(draft.mediaUrl) === "image" ? (
                            <img
                              alt="Campaign media preview"
                              className="max-h-28 rounded-lg object-cover"
                              src={draft.mediaUrl}
                            />
                          ) : (
                            <div className="space-y-2 text-center">
                              <ImageIcon className="mx-auto h-5 w-5 text-slate-400" />
                              <p className="break-all text-xs text-slate-500 dark:text-slate-400">
                                {draft.mediaUrl}
                              </p>
                            </div>
                          )
                        ) : (
                          <div className="space-y-2 text-center">
                            <ImageIcon className="mx-auto h-5 w-5 text-slate-400" />
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              No media attached yet
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#e8e2d8] bg-[#faf8f4] p-4 dark:border-white/10 dark:bg-[#0b1324]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#182235] dark:text-white">
                          Use WhatsApp approved template
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Enable this when the campaign should send outside the active customer service window.
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-pressed={draft.useApprovedTemplate}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            useApprovedTemplate: !current.useApprovedTemplate,
                          }))
                        }
                        className={cn(
                          "relative h-7 w-12 rounded-full transition-colors",
                          draft.useApprovedTemplate
                            ? "bg-[#fe901d]"
                            : "bg-slate-300 dark:bg-slate-700",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-1 h-5 w-5 rounded-full bg-white transition-transform",
                            draft.useApprovedTemplate ? "left-6" : "left-1",
                          )}
                        />
                      </button>
                    </div>

                    {draft.useApprovedTemplate ? (
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className={formLabelClass}>Template Name</Label>
                          <Input
                            className={formFieldClass}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                templateName: event.target.value,
                              }))
                            }
                            placeholder="e.g., land_promo_v1"
                            value={draft.templateName}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className={formLabelClass}>Template Language</Label>
                          <Input
                            className={formFieldClass}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                templateLanguage: event.target.value,
                              }))
                            }
                            placeholder="en"
                            value={draft.templateLanguage}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-[#e8e2d8] bg-[#faf8f4] p-4 dark:border-white/10 dark:bg-[#0b1324]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#182235] dark:text-white">
                          Enable Jennifer to handle replies
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Reply automation can use this campaign context later when the inbox handover is wired.
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-pressed={draft.enableJenniferReplies}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            enableJenniferReplies: !current.enableJenniferReplies,
                          }))
                        }
                        className={cn(
                          "relative h-7 w-12 rounded-full transition-colors",
                          draft.enableJenniferReplies
                            ? "bg-[#fe901d]"
                            : "bg-slate-300 dark:bg-slate-700",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-1 h-5 w-5 rounded-full bg-white transition-transform",
                            draft.enableJenniferReplies ? "left-6" : "left-1",
                          )}
                        />
                      </button>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <Label className={formLabelClass}>Campaign Context</Label>
                      <Textarea
                        className="h-24 resize-y rounded-lg border-[#e8e2d8] bg-white text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-[#fe901d] focus-visible:ring-[#fe901d] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-100 dark:placeholder:text-slate-500"
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            campaignContext: event.target.value,
                          }))
                        }
                        placeholder="e.g., Land promo for buyers around DHA Phase 6. Jennifer should answer pricing, plot sizes, payment plan, and viewing questions."
                        value={draft.campaignContext}
                      />
                    </div>
                  </div>

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
                <WhatsAppMessagePreview
                  message={campaignPreview.renderedMessage}
                  sampleContactName={campaignPreview.sampleContactName}
                  sampleLastAction={campaignPreview.sampleLastAction}
                />
              </div>
            </aside>
          </div>
        </div>

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="border-[#e8e2d8] bg-white dark:border-white/10 dark:bg-[#0d1524] sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Campaign Preview</DialogTitle>
            </DialogHeader>
            <WhatsAppMessagePreview
              message={campaignPreview.renderedMessage}
              sampleContactName={campaignPreview.sampleContactName}
              sampleLastAction={campaignPreview.sampleLastAction}
            />
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
                This will validate the draft, snapshot the launch payload, and
                move the campaign into the queued state.
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
                disabled={isSavingCampaign || isLaunchingCampaign}
                onClick={queueCampaign}
              >
                {isLaunchingCampaign ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="mr-2 h-4 w-4" />
                )}
                Queue Campaign
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
                {(selectedCampaign.mediaUrl ||
                  selectedCampaign.useApprovedTemplate ||
                  selectedCampaign.enableJenniferReplies ||
                  selectedCampaign.campaignContext) && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Delivery Setup
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs text-muted-foreground">Template Mode</p>
                        <p className="mt-1 text-sm font-semibold text-foreground dark:text-white">
                          {selectedCampaign.useApprovedTemplate
                            ? `${selectedCampaign.templateName || "Template"} (${selectedCampaign.templateLanguage || "n/a"})`
                            : "Freeform session message"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs text-muted-foreground">Jennifer Replies</p>
                        <p className="mt-1 text-sm font-semibold text-foreground dark:text-white">
                          {selectedCampaign.enableJenniferReplies ? "Enabled" : "Disabled"}
                        </p>
                      </div>
                    </div>
                    {selectedCampaign.mediaUrl ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <p className="mb-2 text-xs text-muted-foreground">Media</p>
                        {selectedCampaign.mediaType === "image" ? (
                          <img
                            alt="Campaign media"
                            className="max-h-40 rounded-lg object-cover"
                            src={selectedCampaign.mediaUrl}
                          />
                        ) : (
                          <a
                            className="break-all text-sm font-medium text-[#fe901d]"
                            href={selectedCampaign.mediaUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {selectedCampaign.mediaUrl}
                          </a>
                        )}
                      </div>
                    ) : null}
                    {selectedCampaign.campaignContext ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <p className="mb-2 text-xs text-muted-foreground">Campaign Context</p>
                        <p className="text-sm text-foreground dark:text-white">
                          {selectedCampaign.campaignContext}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    [
                      "Audience",
                      selectedCampaignDetail?.recipientCount ??
                        selectedCampaign.audience,
                    ],
                    ["Sent", selectedCampaign.sent],
                    [
                      "Delivered",
                      selectedCampaignDetail?.deliveredRecipients ??
                        selectedCampaign.delivered,
                    ],
                    [
                      "Failed",
                      selectedCampaignDetail?.failedRecipients ??
                        selectedCampaign.failed,
                    ],
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Event History
                    </p>
                    {selectedCampaignDetail?.latestEventType ? (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Latest: {selectedCampaignDetail.latestEventType}
                      </span>
                    ) : null}
                  </div>
                  {selectedCampaignDetailQuery.isLoading ? (
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/5">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading campaign history
                    </div>
                  ) : selectedCampaignDetail?.events?.length ? (
                    <div className="space-y-2">
                      {selectedCampaignDetail.events.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground dark:text-white">
                                {event.summary}
                              </p>
                              <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {event.eventType}
                              </p>
                            </div>
                            <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
                              {event.createdAt}
                            </span>
                          </div>
                          {event.payloadPreview ? (
                            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                              {event.payloadPreview}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-sm text-muted-foreground dark:border-white/10">
                      No campaign events recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default CampaignsPage;
