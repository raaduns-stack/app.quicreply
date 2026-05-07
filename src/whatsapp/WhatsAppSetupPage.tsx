import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useNavigate } from "react-router";
import { completeOfficialApiSetup } from "wasp/client/operations";
import {
  Building2,
  CheckCircle2,
  Copy,
  FileText,
  Globe,
  Loader2,
  Shield,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Button } from "../client/components/ui/button";
import { useToast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";
import UserLayout from "../user/layout/UserLayout";

export default function WhatsAppSetupPage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [apiStatus, setApiStatus] = useState<"none" | "pending" | "approved" | "rejected">(
    "pending",
  );

  // Form state
  const [businessInfo, setBusinessInfo] = useState({
    businessName: "",
    country: "",
    website: "",
  });
  const [businessManagerId, setBusinessManagerId] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [metaConnected, setMetaConnected] = useState(false);

  function handleConnectMeta() {
    setIsSaving(true);
    setTimeout(() => {
      setMetaConnected(true);
      setIsSaving(false);
      toast({
        title: "Connected to Meta",
        description: "Your Meta account is now linked.",
      });
    }, 1500);
  }

  function handleFileUpload() {
    const mockFiles = ["CAC_Certificate.pdf", "Utility_Bill.pdf", "Director_ID.jpg"];
    const next = mockFiles[uploadedDocs.length] || "Additional_Doc.pdf";
    setUploadedDocs([...uploadedDocs, next]);
  }

  function handleRemoveDoc(doc: string) {
    setUploadedDocs(uploadedDocs.filter((d) => d !== doc));
  }

  async function handleSubmit() {
    setIsSaving(true);
    try {
      await completeOfficialApiSetup({});
      toast({
        title: "Setup submitted",
        description: "Your WhatsApp API setup has been submitted for review.",
      });
      navigate("/whatsapp");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Could not complete setup",
        description: error?.message || "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Status color mapping
  const statusPillStyles = {
    required: "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
    connect: "bg-[#fff3e1] text-[#c96a00] dark:bg-[rgba(254,144,29,0.12)] dark:text-[#ffb84d]",
    review: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    rejected: "bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-300",
  };

  const apiStatusText =
    apiStatus === "approved" ? "Approved" : apiStatus === "rejected" ? "Rejected" : "Pending";
  const apiStatusColor =
    apiStatus === "approved"
      ? statusPillStyles.approved
      : apiStatus === "rejected"
        ? statusPillStyles.rejected
        : statusPillStyles.pending;

  return (
    <UserLayout user={user}>
      <div className="w-full space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#182235] dark:text-white">
              Official WhatsApp API Setup
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Complete all steps below to enable your WhatsApp Business API integration.
            </p>
          </div>

          {/* API status pill */}
          <div className="inline-flex items-center gap-3 rounded-2xl border border-[#e8e2d8] bg-white px-5 py-3.5 shadow-sm dark:border-white/10 dark:bg-[#0d1524]">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                apiStatusColor,
              )}
            >
              <div className="h-2 w-2 rounded-full bg-current" />
              {apiStatusText}
            </div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
            {/* LEFT COLUMN: Step cards */}
            <div className="space-y-6">
              {/* Step 1: Business Info */}
              <div className="overflow-hidden rounded-2xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
                <div className="flex items-center gap-3.5 border-b border-[#e8e2d8] bg-white px-5 py-4.5 dark:border-white/10 dark:bg-[#0d1524]">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fe901d] text-white text-sm font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-slate-100">Business Info</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                      statusPillStyles.required,
                    )}
                  >
                    Required
                  </span>
                </div>
                <div className="space-y-4 px-5 pb-5 pt-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                      Business Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter business name"
                      value={businessInfo.businessName}
                      onChange={(e) =>
                        setBusinessInfo({ ...businessInfo, businessName: e.target.value })
                      }
                      className={cn(
                        "h-10 w-full rounded-lg border border-[#e8e2d8] bg-white px-3 text-sm outline-none focus:border-[#fe901d] focus:ring-2 focus:ring-[#fe901d]/20",
                        "dark:border-white/10 dark:bg-[#111827] dark:text-slate-100",
                      )}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                      Country
                    </label>
                    <select
                      value={businessInfo.country}
                      onChange={(e) =>
                        setBusinessInfo({ ...businessInfo, country: e.target.value })
                      }
                      className={cn(
                        "h-10 w-full rounded-lg border border-[#e8e2d8] bg-white px-3 text-sm outline-none focus:border-[#fe901d] focus:ring-2 focus:ring-[#fe901d]/20",
                        "dark:border-white/10 dark:bg-[#111827] dark:text-slate-100",
                      )}
                    >
                      <option value="">Select a country</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Kenya">Kenya</option>
                      <option value="South Africa">South Africa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                      Website
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com"
                      value={businessInfo.website}
                      onChange={(e) =>
                        setBusinessInfo({ ...businessInfo, website: e.target.value })
                      }
                      className={cn(
                        "h-10 w-full rounded-lg border border-[#e8e2d8] bg-white px-3 text-sm outline-none focus:border-[#fe901d] focus:ring-2 focus:ring-[#fe901d]/20",
                        "dark:border-white/10 dark:bg-[#111827] dark:text-slate-100",
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Meta Link */}
              <div className="overflow-hidden rounded-2xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
                <div className="flex items-center gap-3.5 border-b border-[#e8e2d8] bg-white px-5 py-4.5 dark:border-white/10 dark:bg-[#0d1524]">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fe901d] text-white text-sm font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-slate-100">Meta Link</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                      statusPillStyles.connect,
                    )}
                  >
                    Connect
                  </span>
                </div>
                <div className="px-5 pb-5 pt-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Left card: Business Manager ID */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#111827]">
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2">
                        Business Manager ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 123456789"
                        value={businessManagerId}
                        onChange={(e) => setBusinessManagerId(e.target.value)}
                        className={cn(
                          "h-10 w-full rounded-lg border border-[#e8e2d8] bg-white px-3 text-sm outline-none focus:border-[#fe901d] focus:ring-2 focus:ring-[#fe901d]/20",
                          "dark:border-white/10 dark:bg-[#0d1524] dark:text-slate-100",
                        )}
                      />
                    </div>

                    {/* Right card: Connect button */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col items-center justify-center dark:border-white/10 dark:bg-[#111827]">
                      <Button
                        onClick={handleConnectMeta}
                        disabled={isSaving || metaConnected}
                        className="w-full bg-[#fe901d] hover:bg-[#e67e0d] text-white"
                      >
                        {metaConnected ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Connected
                          </>
                        ) : isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Globe className="mr-2 h-4 w-4" />
                            Connect Meta
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Verification */}
              <div className="overflow-hidden rounded-2xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
                <div className="flex items-center gap-3.5 border-b border-[#e8e2d8] bg-white px-5 py-4.5 dark:border-white/10 dark:bg-[#0d1524]">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fe901d] text-white text-sm font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-slate-100">Verification</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                      statusPillStyles.review,
                    )}
                  >
                    Review
                  </span>
                </div>
                <div className="px-5 pb-5 pt-5">
                  <div
                    onClick={handleFileUpload}
                    role="button"
                    tabIndex={0}
                    className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center cursor-pointer transition hover:border-[#fe901d] hover:bg-[#fe901d]/5 dark:border-white/20 dark:bg-[#111827]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fe901d]/10 text-[#fe901d] mx-auto">
                      <Upload className="h-6 w-6" strokeWidth={2} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                      Upload business documents
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Certificate or license required. Click to upload
                    </p>
                  </div>

                  {uploadedDocs.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {uploadedDocs.map((doc) => (
                        <div
                          key={doc}
                          className="flex items-center gap-3 rounded-lg border border-[#e8e2d8] bg-slate-50 p-3 dark:border-white/10 dark:bg-[#111827]"
                        >
                          <FileText className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          <span className="text-sm text-slate-900 dark:text-slate-100">{doc}</span>
                          <button
                            onClick={() => handleRemoveDoc(doc)}
                            className="ml-auto text-slate-400 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Status */}
              <div className="overflow-hidden rounded-2xl border border-[#e8e2d8] bg-white shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
                <div className="flex items-center gap-3.5 border-b border-[#e8e2d8] bg-white px-5 py-4.5 dark:border-white/10 dark:bg-[#0d1524]">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fe901d] text-white text-sm font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-slate-100">Status</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider",
                      apiStatusColor,
                    )}
                  >
                    {apiStatusText}
                  </span>
                </div>
                <div className="px-5 pb-5 pt-5">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Your API verification status. Once approved, you can start sending messages at scale.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setApiStatus("pending")}
                      className={apiStatus === "pending" ? "ring-2 ring-[#fe901d]" : ""}
                    >
                      Mark Pending
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setApiStatus("approved")}
                      className={apiStatus === "approved" ? "ring-2 ring-[#fe901d]" : ""}
                    >
                      Mark Approved
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setApiStatus("rejected")}
                      className={apiStatus === "rejected" ? "ring-2 ring-[#fe901d]" : ""}
                    >
                      Mark Rejected
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Sidebar cards */}
            <div className="space-y-6">
              {/* Quick Summary Card */}
              <div className="rounded-2xl border border-[#e8e2d8] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Quick Summary</h3>
                <div className="rounded-lg bg-slate-50 p-3 font-mono text-xs overflow-x-auto dark:bg-[#111827] dark:text-slate-300">
                  <div className="text-slate-600 dark:text-slate-400">route: /whatsapp/setup</div>
                  <div className="text-slate-600 dark:text-slate-400">whatsapp_mode: official</div>
                  <div className="text-slate-600 dark:text-slate-400">
                    api_status: {apiStatus}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    qr_connected: {metaConnected ? "true" : "false"}
                  </div>
                </div>
              </div>

              {/* What Users Will See Card */}
              <div className="rounded-2xl border border-[#e8e2d8] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-4">
                  What Users Will See
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Send 100+ messages per day
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Green checkmark for verified business
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      24/7 delivery guarantees
                    </span>
                  </li>
                </ul>
              </div>

              {/* Finish Card */}
              <div className="rounded-2xl border border-[#e8e2d8] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0d1524] dark:shadow-none">
                <Button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="w-full bg-[#fe901d] hover:bg-[#e68018] text-white font-bold"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Submit for Review and Continue
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
      </div>
    </UserLayout>
  );
}
