import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  MessageSquare,
  Phone,
  Shield,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import UserLayout from "../user/layout/UserLayout";
import { Card, CardContent } from "../client/components/ui/card";
import { Button } from "../client/components/ui/button";
import { Input } from "../client/components/ui/input";
import { Label } from "../client/components/ui/label";
import { Progress } from "../client/components/ui/progress";
import { useToast } from "../client/hooks/use-toast";
import { cn } from "../client/utils";

type StepId = 1 | 2 | 3 | 4 | 5 | 6;

const steps = [
  { id: 1, title: "Business Info", description: "Verify your legal business details", icon: Building2 },
  { id: 2, title: "Upload Documents", description: "CAC cert and supporting documents", icon: FileText },
  { id: 3, title: "Connect Meta", description: "Sign in with your Facebook account", icon: Shield },
  { id: 4, title: "Select Business", description: "Pick your Meta Business Manager", icon: Globe },
  { id: 5, title: "Connect WhatsApp", description: "Register your phone number", icon: Phone },
  { id: 6, title: "All Set", description: "Workspace is live", icon: CheckCircle2 },
] as const;

type MockBusiness = { id: string; name: string; verified: boolean; country: string };
type MockWaba = { id: string; name: string; phone: string | null; status: "available" | "pending" };

const mockBusinesses: MockBusiness[] = [
  { id: "biz_001", name: "QuicReply Enterprises", verified: true, country: "Nigeria" },
  { id: "biz_002", name: "Azam's Side Hustle Ltd", verified: false, country: "Nigeria" },
  { id: "biz_003", name: "Growth Labs Africa", verified: true, country: "Nigeria" },
];

const mockWabas: MockWaba[] = [
  { id: "waba_001", name: "QuicReply Support", phone: "+234 801 234 5678", status: "available" },
  { id: "waba_002", name: "QuicReply Sales", phone: null, status: "available" },
];

export default function WhatsAppSetupPage({ user }: { user: AuthUser }) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [isSaving, setIsSaving] = useState(false);

  // Mock form state
  const [businessInfo, setBusinessInfo] = useState({
    legalName: "",
    registrationNumber: "",
    email: user.email || "",
    phone: "",
    country: "Nigeria",
    website: "",
    address: "",
  });
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  const [metaConnected, setMetaConnected] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedWabaId, setSelectedWabaId] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  const progressValue = (currentStep / 6) * 100;

  function goNext() {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      if (currentStep < 6) {
        setCurrentStep((currentStep + 1) as StepId);
      }
    }, 600);
  }

  function goBack() {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as StepId);
    }
  }

  function handleConnectMeta() {
    setIsSaving(true);
    // Mock OAuth popup
    setTimeout(() => {
      setMetaConnected(true);
      setIsSaving(false);
      toast({
        title: "Connected to Meta",
        description: "Your Facebook Business account is now linked.",
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

  function handleSendOtp() {
    setIsSaving(true);
    setTimeout(() => {
      setOtpSent(true);
      setIsSaving(false);
      toast({
        title: "OTP sent",
        description: "Check the phone number for a 6-digit code.",
      });
    }, 800);
  }

  function handleVerifyOtp() {
    if (otpCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "Please enter the 6-digit code.",
      });
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      setPhoneVerified(true);
      setIsSaving(false);
      toast({
        title: "Phone verified",
        description: "Your number is now linked to WhatsApp.",
      });
    }, 800);
  }

  function handleFinish() {
    toast({
      title: "🎉 WhatsApp API is live!",
      description: "Your workspace can now send high-volume messages.",
    });
    navigate("/whatsapp");
  }

  // Validation per step
  const canProceed = (() => {
    switch (currentStep) {
      case 1:
        return (
          businessInfo.legalName.trim() &&
          businessInfo.registrationNumber.trim() &&
          businessInfo.email.trim() &&
          businessInfo.phone.trim()
        );
      case 2:
        return uploadedDocs.length >= 1;
      case 3:
        return metaConnected;
      case 4:
        return selectedBusinessId !== null;
      case 5:
        return selectedWabaId !== null && phoneVerified;
      case 6:
        return true;
      default:
        return false;
    }
  })();

  return (
    <UserLayout user={user}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm">
          <Link to="/whatsapp" className="text-muted-foreground hover:text-foreground">
            WhatsApp
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold text-foreground">API Setup</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Left — Step list */}
          <div>
            <div className="mb-4">
              <p className="text-sm font-medium text-muted-foreground">Setup progress</p>
              <h2 className="text-xl font-black tracking-tight text-foreground">
                Step {currentStep} of 6
              </h2>
              <Progress className="mt-3 h-1.5" value={progressValue} />
              <p className="mt-2 text-xs text-muted-foreground">
                {Math.round(progressValue)}% complete
              </p>
            </div>

            <div className="space-y-2">
              {steps.map((step) => {
                const isActive = currentStep === step.id;
                const isComplete = currentStep > step.id;
                const Icon = step.icon;
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 transition",
                      isActive && "border-primary/50 bg-primary/5 shadow-sm",
                      !isActive && !isComplete && "border-border/60 bg-transparent",
                      isComplete && "border-emerald-500/30 bg-emerald-500/5",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black",
                        isActive && "bg-primary text-white",
                        !isActive && !isComplete && "bg-muted text-muted-foreground",
                        isComplete && "bg-emerald-600 text-white",
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-bold",
                          isActive ? "text-foreground" : "text-foreground/80",
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button asChild variant="ghost" size="sm" className="mt-6 w-full">
              <Link to="/whatsapp">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Cancel setup
              </Link>
            </Button>
          </div>

          {/* Right — Step content */}
          <Card className="border-border/60">
            <CardContent className="p-6 md:p-8">
              {/* Step 1: Business Info */}
              {currentStep === 1 ? (
                <div>
                  <div className="mb-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                      <Building2 className="h-3 w-3" />
                      Step 1 of 6
                    </span>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">
                      Business Information
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Meta requires your legal business details for KYC verification. This is kept private.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="legalName">Legal business name *</Label>
                      <Input
                        id="legalName"
                        className="mt-1.5"
                        placeholder="ABC Properties Limited"
                        value={businessInfo.legalName}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, legalName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="regNumber">Registration number (CAC / RC) *</Label>
                      <Input
                        id="regNumber"
                        className="mt-1.5"
                        placeholder="RC1234567"
                        value={businessInfo.registrationNumber}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, registrationNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Business email *</Label>
                      <Input
                        id="email"
                        type="email"
                        className="mt-1.5"
                        placeholder="info@abc.com"
                        value={businessInfo.email}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Business phone *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        className="mt-1.5"
                        placeholder="+234 801 234 5678"
                        value={businessInfo.phone}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        className="mt-1.5"
                        value={businessInfo.country}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, country: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        className="mt-1.5"
                        placeholder="https://abc.com"
                        value={businessInfo.website}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, website: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="address">Business address</Label>
                      <Input
                        id="address"
                        className="mt-1.5"
                        placeholder="123 Victoria Island, Lagos, Nigeria"
                        value={businessInfo.address}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-4">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" strokeWidth={2} />
                    <div>
                      <p className="text-xs font-bold text-foreground">Your data is encrypted and secure</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        We only share verification documents with Meta for WhatsApp approval. Nothing else leaves QuicReply.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Step 2: Upload Documents */}
              {currentStep === 2 ? (
                <div>
                  <div className="mb-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                      <FileText className="h-3 w-3" />
                      Step 2 of 6
                    </span>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">
                      Verification Documents
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload proof of your business. Meta reviews these during WhatsApp approval.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/60 p-4">
                      <p className="text-sm font-bold text-foreground">Required documents</p>
                      <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>CAC certificate / business registration (PDF or image)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Utility bill (optional, strengthens application)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Director's ID (optional)</span>
                        </li>
                      </ul>
                    </div>

                    {/* Upload zone */}
                    <div
                      className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/20 p-8 text-center transition hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                      onClick={handleFileUpload}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Upload className="h-6 w-6" strokeWidth={2} />
                      </div>
                      <p className="mt-3 text-sm font-bold text-foreground">
                        Drop files here or click to upload
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        PDF, JPG, PNG — max 10MB each
                      </p>
                    </div>

                    {/* Uploaded files */}
                    {uploadedDocs.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Uploaded ({uploadedDocs.length})
                        </p>
                        {uploadedDocs.map((doc) => (
                          <div
                            key={doc}
                            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                              <FileText className="h-4 w-4" strokeWidth={2} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">{doc}</p>
                              <p className="text-xs text-muted-foreground">Uploaded • 1.2 MB</p>
                            </div>
                            <button
                              className="text-muted-foreground hover:text-red-500"
                              onClick={() => handleRemoveDoc(doc)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Step 3: Connect Meta */}
              {currentStep === 3 ? (
                <div>
                  <div className="mb-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                      <Shield className="h-3 w-3" />
                      Step 3 of 6
                    </span>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">
                      Connect your Meta account
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Sign in with Facebook to link your Meta Business Manager to QuicReply.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-black tracking-tight text-foreground">
                          Sign in with Facebook
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          We'll request these permissions:
                        </p>
                        <ul className="mt-3 space-y-1.5 text-xs">
                          {[
                            "Manage your businesses (business_management)",
                            "Manage WhatsApp Business Accounts",
                            "Send messages on your behalf",
                          ].map((perm) => (
                            <li key={perm} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={2.5} />
                              <span className="text-foreground">{perm}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {metaConnected ? (
                      <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          Connected as {businessInfo.email}
                        </p>
                      </div>
                    ) : (
                      <Button
                        className="mt-5 w-full bg-blue-600 hover:bg-blue-700"
                        onClick={handleConnectMeta}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Opening Facebook...
                          </>
                        ) : (
                          <>
                            Continue with Facebook
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-4">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" strokeWidth={2} />
                    <div>
                      <p className="text-xs font-bold text-foreground">Tip</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Make sure you're logged into the correct Facebook account that manages your business page.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Step 4: Select Business */}
              {currentStep === 4 ? (
                <div>
                  <div className="mb-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                      <Globe className="h-3 w-3" />
                      Step 4 of 6
                    </span>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">
                      Select your Business Manager
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      We found {mockBusinesses.length} Business Manager{mockBusinesses.length > 1 ? "s" : ""} under your Meta account. Pick the one that owns your WhatsApp number.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {mockBusinesses.map((biz) => {
                      const isSelected = selectedBusinessId === biz.id;
                      return (
                        <button
                          key={biz.id}
                          className={cn(
                            "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition",
                            isSelected
                              ? "border-primary/50 bg-primary/5 shadow-sm"
                              : "border-border/60 bg-card hover:border-primary/30 hover:bg-primary/5",
                          )}
                          onClick={() => setSelectedBusinessId(biz.id)}
                          type="button"
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                            <Building2 className="h-5 w-5" strokeWidth={2} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-bold text-foreground">{biz.name}</p>
                              {biz.verified ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-black text-blue-600">
                                  <ShieldCheck className="h-2.5 w-2.5" />
                                  Verified
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Business ID: {biz.id} • {biz.country}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                              isSelected ? "border-primary bg-primary" : "border-border",
                            )}
                          >
                            {isSelected ? <div className="h-2 w-2 rounded-full bg-white" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button className="mt-4 text-sm font-medium text-primary hover:underline">
                    Don't see your business? Create a new one →
                  </button>
                </div>
              ) : null}

              {/* Step 5: Connect WhatsApp */}
              {currentStep === 5 ? (
                <div>
                  <div className="mb-6">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                      <Phone className="h-3 w-3" />
                      Step 5 of 6
                    </span>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">
                      Connect WhatsApp Number
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pick an existing WhatsApp Business Account (WABA) or register a new number.
                    </p>
                  </div>

                  {/* WABA selection */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Available WABAs
                    </p>
                    <div className="mt-2 space-y-2">
                      {mockWabas.map((waba) => {
                        const isSelected = selectedWabaId === waba.id;
                        return (
                          <button
                            key={waba.id}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                              isSelected
                                ? "border-primary/50 bg-primary/5"
                                : "border-border/60 hover:border-primary/30",
                            )}
                            onClick={() => {
                              setSelectedWabaId(waba.id);
                              setOtpSent(false);
                              setPhoneVerified(false);
                            }}
                            type="button"
                          >
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                              <MessageSquare className="h-4 w-4" strokeWidth={2} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-foreground">{waba.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {waba.phone || "No number registered yet"}
                              </p>
                            </div>
                            <div
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                                isSelected ? "border-primary bg-primary" : "border-border",
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Phone registration */}
                  {selectedWabaId ? (
                    <div className="mt-6 rounded-xl border border-border/60 p-5">
                      <p className="text-sm font-bold text-foreground">Register phone number</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Meta will send a 6-digit code to verify ownership.
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                        <Input
                          placeholder="+234 801 234 5678"
                          type="tel"
                          disabled={otpSent}
                          defaultValue="+234 801 234 5678"
                        />
                        <Button
                          onClick={handleSendOtp}
                          disabled={otpSent || isSaving}
                          variant="outline"
                        >
                          {otpSent ? "Code sent" : isSaving ? "Sending..." : "Send OTP"}
                        </Button>
                      </div>

                      {otpSent && !phoneVerified ? (
                        <div className="mt-4">
                          <Label>Enter 6-digit code</Label>
                          <div className="mt-1.5 grid gap-3 sm:grid-cols-[1fr_auto]">
                            <Input
                              placeholder="123456"
                              maxLength={6}
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                            />
                            <Button onClick={handleVerifyOtp} disabled={isSaving || otpCode.length !== 6}>
                              {isSaving ? "Verifying..." : "Verify"}
                            </Button>
                          </div>
                          <button className="mt-2 text-xs text-muted-foreground hover:text-foreground">
                            Didn't get the code? Resend
                          </button>
                        </div>
                      ) : null}

                      {phoneVerified ? (
                        <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
                          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                            Phone number verified and linked to WhatsApp
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Step 6: Completion */}
              {currentStep === 6 ? (
                <div className="text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
                    <CheckCircle2 className="h-10 w-10" strokeWidth={2.5} />
                  </div>
                  <h2 className="mt-5 text-3xl font-black tracking-tight text-foreground">
                    WhatsApp API is live! 🎉
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                    Your workspace is now running on the Official WhatsApp Business API. Higher limits, verified badge, 24/7 uptime.
                  </p>

                  <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-6 text-left">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Business</span>
                        <span className="font-bold text-foreground">{businessInfo.legalName || "QuicReply Enterprises"}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">WhatsApp number</span>
                        <span className="font-bold text-foreground">+234 801 234 5678</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">KYC status</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-600">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Verified
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Daily limit</span>
                        <span className="font-bold text-foreground">10,000 msgs</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button asChild variant="outline">
                      <Link to="/whatsapp">
                        Back to WhatsApp
                      </Link>
                    </Button>
                    <Button onClick={handleFinish}>
                      Go to Dashboard
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Navigation footer */}
              {currentStep < 6 ? (
                <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-6">
                  <Button
                    variant="ghost"
                    onClick={goBack}
                    disabled={currentStep === 1}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={goNext} disabled={!canProceed || isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Continue
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </UserLayout>
  );
}
