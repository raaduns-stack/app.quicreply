import { type AuthUser } from "wasp/auth";
import { useEffect, useMemo, useState } from "react";
import {
  createCampaign as createCampaignOperation,
  getCampaigns,
  useQuery,
} from "wasp/client/operations";
import UserLayout from "./layout/UserLayout";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Megaphone,
  MessageSquareText,
  RotateCcw,
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
};

const EMPTY_CAMPAIGN_DRAFT: CampaignDraft = {
  name: "",
  subtitle: "",
  message: "",
};

function CampaignCreateDialog({
  open,
  draft,
  error,
  isSaving,
  onClose,
  onSave,
  setDraft,
}: {
  open: boolean;
  draft: CampaignDraft;
  error: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  setDraft: React.Dispatch<React.SetStateAction<CampaignDraft>>;
}) {
  const inputClass =
    "h-10 border-[#e8e2d8] bg-[#f7f8fa] text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-[#fe901d] focus-visible:ring-[#fe901d] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-100 dark:placeholder:text-slate-500";

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] border-[#e8e2d8] bg-white text-foreground shadow-2xl shadow-black/10 sm:max-w-[560px] sm:rounded-xl dark:border-white/10 dark:bg-[#0d1524] dark:text-slate-100 dark:shadow-black/50">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Campaign</DialogTitle>
          <DialogDescription>
            Save a real campaign draft using your current contacts as the
            audience.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest">
              Campaign Name <span className="text-destructive">*</span>
            </Label>
            <Input
              className={inputClass}
              placeholder="e.g. Weekend Offer"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest">
              Subtitle
            </Label>
            <Input
              className={inputClass}
              placeholder="Short internal label"
              value={draft.subtitle}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  subtitle: event.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-widest">
              WhatsApp Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              className="h-28 resize-none border-[#e8e2d8] bg-[#f7f8fa] text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-[#fe901d] focus-visible:ring-[#fe901d] dark:border-white/10 dark:bg-[#0b1324] dark:text-slate-100 dark:placeholder:text-slate-500"
              placeholder="Write the message customers will receive..."
              value={draft.message}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={isSaving} onClick={onSave}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                <Megaphone className="h-4 w-4" />
                Save Draft
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CampaignsPage = ({ user }: { user: AuthUser }) => {
  const { toast } = useToast();
  const campaignsQuery = useQuery(getCampaigns);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

  async function saveCampaign() {
    if (!draft.name.trim() || !draft.message.trim()) {
      setDraftError("Campaign name and message are required.");
      return;
    }

    setIsSavingCampaign(true);
    setDraftError("");

    try {
      const createdCampaign = (await createCampaignOperation({
        name: draft.name.trim(),
        subtitle: draft.subtitle.trim(),
        message: draft.message.trim(),
        audience: "allContacts",
      })) as Campaign;
      setCampaigns((current) => [createdCampaign, ...current]);
      setIsCreateOpen(false);
      toast({
        title: "Campaign draft saved",
        description: "Audience was snapshotted from your current contacts.",
      });
    } catch (err: any) {
      setDraftError(err?.message || "Could not save campaign.");
    } finally {
      setIsSavingCampaign(false);
    }
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
                        setSelectedCampaignId(campaign.id);
                        setIsPanelOpen(true);
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
          <div className="fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsPanelOpen(false)}
            />
            <div className="absolute bottom-0 right-0 top-0 w-full max-w-md bg-white shadow-xl dark:bg-[#0d1524]">
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
                    onClick={() => setIsPanelOpen(false)}
                    className="text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white"
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

      <CampaignCreateDialog
        open={isCreateOpen}
        draft={draft}
        error={draftError}
        isSaving={isSavingCampaign}
        onClose={() => setIsCreateOpen(false)}
        onSave={saveCampaign}
        setDraft={setDraft}
      />
    </UserLayout>
  );
};

export default CampaignsPage;
