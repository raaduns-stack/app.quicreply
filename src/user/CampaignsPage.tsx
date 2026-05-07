import { type AuthUser } from "wasp/auth";
import { useState } from "react";
import UserLayout from "./layout/UserLayout";
import { ChevronRight, ChevronLeft, X, Search, Calendar, RotateCcw } from "lucide-react";

interface Campaign {
  id: number;
  emoji: string;
  name: string;
  subtitle: string;
  audience: number;
  status: "sent" | "sending" | "queued" | "draft" | "failed";
  sent: number;
  delivered: number;
  deliveryRate: number;
  createdDate: string;
}

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 1,
    emoji: "🎁",
    name: "May Land Promo",
    subtitle: "Land promotion",
    audience: 2450,
    status: "sent",
    sent: 2450,
    delivered: 2312,
    deliveryRate: 94.4,
    createdDate: "May 28, 2024",
  },
  {
    id: 2,
    emoji: "🏠",
    name: "Apo Estate Update",
    subtitle: "New estate launch",
    audience: 1872,
    status: "sending",
    sent: 1250,
    delivered: 1102,
    deliveryRate: 88.2,
    createdDate: "May 31, 2026",
  },
  {
    id: 3,
    emoji: "🏷",
    name: "Weekend Offer",
    subtitle: "Discount announcement",
    audience: 1320,
    status: "queued",
    sent: 0,
    delivered: 0,
    deliveryRate: 0,
    createdDate: "May 31, 2026",
  },
  {
    id: 4,
    emoji: "📋",
    name: "Customer Survey",
    subtitle: "Feedback collection",
    audience: 980,
    status: "draft",
    sent: 0,
    delivered: 0,
    deliveryRate: 0,
    createdDate: "May 29, 2026",
  },
  {
    id: 5,
    emoji: "⭐",
    name: "Referral Program",
    subtitle: "Refer & earn",
    audience: 1560,
    status: "sent",
    sent: 1560,
    delivered: 1420,
    deliveryRate: 91.0,
    createdDate: "May 27, 2026",
  },
  {
    id: 6,
    emoji: "⚠️",
    name: "Price Update",
    subtitle: "Price increase notice",
    audience: 850,
    status: "failed",
    sent: 120,
    delivered: 45,
    deliveryRate: 37.5,
    createdDate: "May 26, 2026",
  },
  {
    id: 7,
    emoji: "🏡",
    name: "Open House Invite",
    subtitle: "Event invitation",
    audience: 760,
    status: "sent",
    sent: 760,
    delivered: 680,
    deliveryRate: 89.5,
    createdDate: "May 25, 2026",
  },
];

const CampaignsPage = ({ user }: { user: AuthUser }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCampaignIdx, setSelectedCampaignIdx] = useState<number | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [dateRange] = useState({
    start: "May 1, 2026",
    end: "May 31, 2026",
  });

  // Filter campaigns
  const filteredCampaigns = MOCK_CAMPAIGNS.filter((campaign) => {
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get selected campaign
  const selectedCampaign =
    selectedCampaignIdx !== null ? filteredCampaigns[selectedCampaignIdx] : null;

  // Status colors
  const getStatusStyles = (status: Campaign["status"]) => {
    switch (status) {
      case "sent":
        return "bg-[#ecfdf5] text-[#059669]";
      case "sending":
        return "bg-[#eff6ff] text-[#0284c7]";
      case "queued":
        return "bg-[#fffbeb] text-[#b45309]";
      case "draft":
        return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
      case "failed":
        return "bg-[#fef2f2] text-[#dc2626]";
      default:
        return "bg-gray-100 text-gray-700";
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

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">Campaigns</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Send and manage broadcast messages
            </p>
          </div>
          <button className="rounded-lg bg-[#fe901d] px-6 py-2 font-medium text-white hover:bg-[#e67e0d]">
            Create Campaign
          </button>
        </div>

        {/* Toolbar */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#0d1524]">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200 dark:bg-white/10" />

            {/* Status Dropdown */}
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

            {/* Date Range Button */}
            <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
              <Calendar className="h-4 w-4" />
              {dateRange.start} – {dateRange.end}
            </button>

            {/* Reset Button */}
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-[#0d1524]">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">
                <tr>
                  <th className="w-8 px-4 py-3">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground dark:text-white">
                    Campaign Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground dark:text-white">
                    Message Preview
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground dark:text-white">
                    Audience
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground dark:text-white">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground dark:text-white">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground dark:text-white">
                    Delivered
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground dark:text-white">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              {/* Table Body */}
              <tbody>
                {filteredCampaigns.map((campaign, idx) => (
                  <tr
                    key={campaign.id}
                    onClick={() => {
                      setSelectedCampaignIdx(idx);
                      setIsPanelOpen(true);
                    }}
                    className="cursor-pointer border-b border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                          <span className="text-lg">{campaign.emoji}</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground dark:text-white">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground dark:text-gray-400">
                            {campaign.subtitle}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground dark:text-gray-400">
                      —
                    </td>
                    <td className="px-6 py-3 text-sm text-foreground dark:text-white">
                      {campaign.audience.toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <div
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${getStatusStyles(
                          campaign.status
                        )}`}
                      >
                        {campaign.status === "sending" && (
                          <span className="animate-pulse">•</span>
                        )}
                        {getStatusLabel(campaign.status)}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-foreground dark:text-white">
                      {campaign.sent.toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <div className="text-sm text-foreground dark:text-white">
                        {campaign.delivered.toLocaleString()}
                        <span className="ml-1 text-xs text-muted-foreground dark:text-gray-400">
                          {campaign.deliveryRate > 0 && `${campaign.deliveryRate}%`}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-[#0d1524]">
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            Showing 1 to {filteredCampaigns.length} of 24 campaigns
          </p>
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5">
              <ChevronLeft className="h-4 w-4 text-foreground dark:text-white" />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-medium text-white">
              1
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-sm text-foreground hover:bg-gray-50 dark:text-white dark:hover:bg-white/5">
              2
            </button>
            <button className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5">
              <ChevronRight className="h-4 w-4 text-foreground dark:text-white" />
            </button>
            <div className="ml-4 border-l border-gray-200 pl-4 dark:border-white/10">
              <select className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Side Panel */}
        {isPanelOpen && selectedCampaign && (
          <div className="fixed inset-0 z-40">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsPanelOpen(false)}
            />

            {/* Panel */}
            <div className="absolute right-0 top-0 bottom-0 w-96 bg-white dark:bg-[#0d1524] shadow-xl">
              {/* Panel Header */}
              <div className="border-b border-gray-200 px-6 py-4 dark:border-white/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-foreground dark:text-white">
                      {selectedCampaign.name}
                    </h2>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${getStatusStyles(
                          selectedCampaign.status
                        )}`}
                      >
                        {selectedCampaign.status === "sending" && (
                          <span className="animate-pulse">•</span>
                        )}
                        {getStatusLabel(selectedCampaign.status)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPanelOpen(false)}
                    className="text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Panel Body */}
              <div className="overflow-y-auto px-6 py-4">
                {/* WhatsApp Message Preview */}
                <div className="mb-6">
                  <p className="mb-3 text-xs font-semibold text-muted-foreground dark:text-gray-400">
                    Message Preview
                  </p>
                  <div className="rounded-lg bg-green-100 dark:bg-green-900 p-4">
                    <p className="text-sm text-green-900 dark:text-green-100">
                      {selectedCampaign.name}
                    </p>
                    <p className="mt-2 text-xs text-green-800 dark:text-green-200">
                      {selectedCampaign.subtitle}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs text-muted-foreground dark:text-gray-400">Sent</p>
                    <p className="mt-1 text-lg font-bold text-foreground dark:text-white">
                      {selectedCampaign.sent.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs text-muted-foreground dark:text-gray-400">Delivered</p>
                    <p className="mt-1 text-lg font-bold text-foreground dark:text-white">
                      {selectedCampaign.delivered.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs text-muted-foreground dark:text-gray-400">Delivery Rate</p>
                    <p className="mt-1 text-lg font-bold text-foreground dark:text-white">
                      {selectedCampaign.deliveryRate > 0
                        ? `${selectedCampaign.deliveryRate}%`
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs text-muted-foreground dark:text-gray-400">
                      Total Audience
                    </p>
                    <p className="mt-1 text-lg font-bold text-foreground dark:text-white">
                      {selectedCampaign.audience.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Audience Sample */}
                <div>
                  <p className="mb-3 text-xs font-semibold text-muted-foreground dark:text-gray-400">
                    Audience Sample
                  </p>
                  <div className="space-y-2">
                    {[
                      "John Doe",
                      "Jane Smith",
                      "Bob Johnson",
                      "Alice Williams",
                      "Charlie Brown",
                    ].map((name) => (
                      <div
                        key={name}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="h-8 w-8 rounded-full bg-blue-200" />
                        <p className="text-sm text-foreground dark:text-white">{name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Footer */}
              <div className="border-t border-gray-200 px-6 py-4 dark:border-white/10">
                <p className="text-xs text-muted-foreground dark:text-gray-400">
                  Created by Agent A
                </p>
                <p className="mt-1 text-xs text-muted-foreground dark:text-gray-400">
                  Created on {selectedCampaign.createdDate}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default CampaignsPage;
