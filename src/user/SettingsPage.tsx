import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import {
  CheckCircle2,
  Edit2,
  Bot,
  MessageSquare,
  Users,
  Download,
  Smartphone,
  Zap,
  Plus,
  MessageCircle,
} from "lucide-react";
import UserLayout from "./layout/UserLayout";
import { Button } from "../client/components/ui/button";

const SettingsPage = ({ user }: { user: AuthUser }) => {
  const [activeTab, setActiveTab] = useState<"profile" | "billing" | "integrations">(
    "profile"
  );

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-5">
        {/* Page Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">Settings</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage your business, integrations, and system preferences
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Reset</Button>
            <Button className="bg-[#fe901d] hover:bg-[#e67e0d] text-white">
              Save Changes
            </Button>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Tab Navigation */}
            <div className="flex gap-8 border-b border-slate-200 mb-8 dark:border-white/10">
              {[
                { id: "profile", label: "Profile" },
                { id: "billing", label: "Billing" },
                { id: "integrations", label: "Integrations" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`pb-4 font-medium text-base relative transition-colors ${
                    activeTab === tab.id
                      ? "text-slate-900 dark:text-white border-b-2 border-amber-500"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-5">
                {/* Card 1: Business Profile */}
                <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 dark:bg-black">
                      <span className="text-xs font-bold text-white">1</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Business Profile
                    </h3>
                  </div>

                  {/* Success Banner */}
                  <div className="mb-6 flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-4">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-300">
                      Optimizing your workspace for Gadget Vendors…
                    </span>
                    <div className="ml-auto h-4 w-4 border-2 border-emerald-600 border-t-emerald-300 rounded-full animate-spin" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Business Name
                      </label>
                      <input
                        type="text"
                        placeholder="Enter business name"
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-600 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Industry / Niche
                      </label>
                      <select className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400">
                        <option value="gadget">Gadget Vendor</option>
                        <option value="hair">Hair & Wigs</option>
                        <option value="fashion">Fashion/Apparel</option>
                        <option value="tech">Consumer Tech</option>
                        <option value="food">Food & Beverage</option>
                        <option value="real-estate">Real Estate</option>
                        <option value="healthcare">Healthcare</option>
                      </select>
                    </div>
                  </div>

                  {/* Auto-configure Toggle */}
                  <div className="mt-6 flex items-center justify-between py-4 border-t border-slate-200 dark:border-white/10">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        Auto-configure System
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Automatically optimize settings based on industry
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-5 w-5 rounded border-slate-300 text-amber-500 accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Card 2: Localization Settings */}
                <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 dark:bg-black">
                      <span className="text-xs font-bold text-white">2</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Localization Settings
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Currency
                      </label>
                      <select className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400">
                        <option value="ngn">₦ Naira NGN</option>
                        <option value="usd">$ USD</option>
                        <option value="eur">€ EUR</option>
                        <option value="gbp">£ GBP</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Timezone
                      </label>
                      <select className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400">
                        <option value="africa-lagos">Africa/Lagos GMT+1</option>
                        <option value="utc">UTC</option>
                        <option value="us-eastern">US/Eastern</option>
                        <option value="us-pacific">US/Pacific</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Card 3: AI Configuration */}
                <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 dark:bg-black">
                      <span className="text-xs font-bold text-white">3</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      AI Configuration (Jennifer)
                    </h3>
                  </div>

                  {/* AI Avatar and Status */}
                  <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-white/10">
                    <div className="relative flex-shrink-0">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                        <MessageCircle className="h-8 w-8 text-white" />
                      </div>
                      <div className="absolute bottom-0 right-0 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white dark:border-[#0d1524]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          Sales Assistant for Gadget Vendor
                        </p>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1">
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            Active
                          </span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Jennifer is learning from your business data
                      </p>
                    </div>
                  </div>

                  {/* AI Controls */}
                  <div className="flex gap-3 mb-6">
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit Persona
                    </Button>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Re-train AI
                    </Button>
                  </div>

                  {/* AI Configuration Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Response Style
                      </label>
                      <select className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400">
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="formal">Formal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        AI Language
                      </label>
                      <select className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400">
                        <option value="english">English</option>
                        <option value="yoruba">Yoruba</option>
                        <option value="spanish">Spanish</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Card 4: Team Management */}
                <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 dark:bg-black">
                      <span className="text-xs font-bold text-white">4</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Team Management
                    </h3>
                  </div>

                  {/* Invite Section */}
                  <div className="mb-6 flex gap-2">
                    <input
                      type="email"
                      placeholder="team@example.com"
                      className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-600 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    />
                    <select className="px-4 py-2 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-900 dark:text-white min-w-[120px] focus:ring-2 focus:ring-amber-400 focus:border-amber-400">
                      <option value="agent">Agent</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <Button className="bg-[#fe901d] hover:bg-[#e67e0d] text-white flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Invite
                    </Button>
                  </div>

                  {/* Team Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10">
                          <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                            Member
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                            Email
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                            Role
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                            Joined
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-slate-700 dark:text-slate-300">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-200 dark:border-white/10">
                          <td className="px-4 py-4 text-slate-900 dark:text-white font-medium">
                            John Doe
                          </td>
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                            john@example.com
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center rounded-full bg-[#fff3e1] dark:bg-[rgba(254,144,29,0.12)] px-2.5 py-1 text-xs font-medium text-[#c96a00] dark:text-[#ffb84d]">
                              Admin
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                            Jan 15, 2025
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              Active
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-xs font-medium text-[#fe901d]">
                              You
                            </span>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-200 dark:border-white/10">
                          <td className="px-4 py-4 text-slate-900 dark:text-white font-medium">
                            Sarah Jenkins
                          </td>
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                            sarah@example.com
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                              Agent
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                            Feb 3, 2025
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                              Active
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300">
                              Remove
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-4 text-slate-900 dark:text-white font-medium">
                            Michael Brown
                          </td>
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                            michael@example.com
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                              Viewer
                            </span>
                          </td>
                          <td className="px-4 py-4 text-slate-600 dark:text-slate-400">
                            Mar 20, 2025
                          </td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center rounded-full bg-yellow-50 dark:bg-yellow-900/20 px-2.5 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-300">
                              Pending
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300">
                              Remove
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* WhatsApp API Upgrade Banner */}
                <div className="bg-slate-900 dark:bg-[#111827] rounded-lg p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <MessageSquare className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-white text-base">
                        WhatsApp API Upgrade
                      </h4>
                      <p className="text-sm text-slate-400 mt-1">
                        Unlock unlimited messaging and advanced features
                      </p>
                    </div>
                  </div>
                  <Button className="bg-[#fe901d] hover:bg-[#e67e0d] text-white">
                    Start API Setup
                  </Button>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === "billing" && (
              <div className="space-y-5">
                {/* Plan Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Starter Plan */}
                  <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                      Starter
                    </h3>
                    <div className="mb-6">
                      <div className="text-3xl font-bold text-slate-900 dark:text-white">
                        $99
                        <span className="text-lg font-normal text-slate-600 dark:text-slate-400">
                          /mo
                        </span>
                      </div>
                      <span className="inline-block mt-3 px-3 py-1 rounded-full bg-[#fff3e1] dark:bg-[rgba(254,144,29,0.12)] text-xs font-medium text-[#c96a00] dark:text-[#ffb84d]">
                        Current Plan
                      </span>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-6">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>Up to 5,000 messages/month</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>Basic AI features</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>Up to 3 team members</span>
                      </li>
                    </ul>
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  </div>

                  {/* Professional Plan */}
                  <div className="bg-white dark:bg-[#0d1524] rounded-lg border-2 border-[#fe901d] dark:border-[#fe901d] p-6 relative">
                    <div className="absolute -top-3 left-4">
                      <span className="inline-block px-3 py-1 rounded-full bg-[#fe901d] text-xs font-bold text-white">
                        Recommended
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 mt-3">
                      Professional
                    </h3>
                    <div className="mb-6">
                      <div className="text-3xl font-bold text-slate-900 dark:text-white">
                        $499
                        <span className="text-lg font-normal text-slate-600 dark:text-slate-400">
                          /mo
                        </span>
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-6">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>Up to 50,000 messages/month</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>Advanced AI & automation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>Up to 15 team members</span>
                      </li>
                    </ul>
                    <Button className="w-full bg-[#fe901d] hover:bg-[#e67e0d] text-white">
                      Upgrade Now
                    </Button>
                  </div>

                  {/* Enterprise Plan */}
                  <div className="bg-slate-900 dark:bg-[#111827] rounded-lg border border-slate-700 dark:border-white/10 p-6">
                    <h3 className="text-lg font-bold text-white mb-2">
                      Enterprise
                    </h3>
                    <div className="mb-6">
                      <div className="text-3xl font-bold text-white">Custom</div>
                      <p className="text-sm text-slate-400 mt-2">
                        For large-scale operations
                      </p>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-400 mb-6">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>Unlimited messages</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>Custom AI training</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>Unlimited team members</span>
                      </li>
                    </ul>
                    <Button
                      variant="outline"
                      className="w-full text-white border-white/20 hover:bg-white/10"
                    >
                      Contact Sales
                    </Button>
                  </div>
                </div>

                {/* Resource Utilization */}
                <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                    Resource Utilization
                  </h3>
                  <div className="space-y-6">
                    {/* Seats */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Seats Used
                        </label>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          3 / 10 (30%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-[#fe901d] h-2 rounded-full"
                          style={{ width: "30%" }}
                        ></div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Monthly Messages
                        </label>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          1,420 / 5,000 (28%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-[#fe901d] h-2 rounded-full"
                          style={{ width: "28%" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === "integrations" && (
              <div className="space-y-8">
                {/* Storefront & E-commerce */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Storefront & E-commerce
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Shopify */}
                    <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                          Shopify Premium
                        </h4>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1">
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            Connected
                          </span>
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Sync products and orders directly to your WhatsApp chatbot
                      </p>
                      <Button variant="outline" className="w-full">
                        Manage
                      </Button>
                    </div>

                    {/* WooCommerce */}
                    <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                          WooCommerce
                        </h4>
                        <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Available
                          </span>
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Connect your WordPress WooCommerce store
                      </p>
                      <Button className="w-full bg-[#fe901d] hover:bg-[#e67e0d] text-white">
                        Connect
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Data & CRM Systems */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Data & CRM Systems
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Google Sheets */}
                    <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                          Google Sheets
                        </h4>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1">
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            Active Sync
                          </span>
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Automatically log conversations and data to Google Sheets
                      </p>
                      <Button variant="outline" className="w-full">
                        Manage
                      </Button>
                    </div>

                    {/* Meta Pixel */}
                    <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                          Meta Pixel/Ads
                        </h4>
                        <span className="inline-flex items-center rounded-full bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1">
                          <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300">
                            Setup Req.
                          </span>
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        Track conversions and retarget customers on Meta platforms
                      </p>
                      <Button className="w-full bg-[#fe901d] hover:bg-[#e67e0d] text-white">
                        Setup
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="w-full xl:w-80 flex-shrink-0 space-y-5">
            {/* System Status */}
            <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                System Status
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    WhatsApp Mode
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    QR Mode
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    API Status
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    Not Setup
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    Jennifer AI
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      Active
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                  <Smartphone className="h-4 w-4 text-slate-600 dark:text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-900 dark:text-white font-medium">
                    Update Business Info
                  </span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                  <Bot className="h-4 w-4 text-slate-600 dark:text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-900 dark:text-white font-medium">
                    Configure AI
                  </span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                  <Users className="h-4 w-4 text-slate-600 dark:text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-900 dark:text-white font-medium">
                    Manage Team
                  </span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                  <Download className="h-4 w-4 text-slate-600 dark:text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-900 dark:text-white font-medium">
                    Export Data
                  </span>
                </button>
              </div>
            </div>

            {/* Automation Health */}
            <div className="bg-white dark:bg-[#0d1524] rounded-lg border border-slate-200 dark:border-white/10 p-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                Automation Health
              </h3>
              <div className="space-y-3 text-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-amber-500 accent-amber-500"
                  />
                  <span className="text-slate-900 dark:text-white">
                    Auto-reply
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-amber-500 accent-amber-500"
                  />
                  <span className="text-slate-900 dark:text-white">
                    Lead capture
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-amber-500 accent-amber-500"
                  />
                  <span className="text-slate-900 dark:text-white">
                    Follow-up
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-amber-500 accent-amber-500"
                  />
                  <span className="text-slate-900 dark:text-white">
                    Escalation
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default SettingsPage;
