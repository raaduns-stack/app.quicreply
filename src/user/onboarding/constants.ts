export const primaryGoalValues = [
  "generate_leads",
  "manage_conversations",
  "close_sales",
  "run_campaigns",
] as const;

export const trafficSourceValues = [
  "ads",
  "website",
  "whatsapp",
  "other",
] as const;

export const whatsappModeValues = ["qr", "api"] as const;
export const apiStatusValues = ["none", "pending", "approved"] as const;

export type PrimaryGoal = (typeof primaryGoalValues)[number];
export type TrafficSource = (typeof trafficSourceValues)[number];
export type WhatsappMode = (typeof whatsappModeValues)[number];
export type ApiStatus = (typeof apiStatusValues)[number];

export const primaryGoalOptions: Array<{
  value: PrimaryGoal;
  label: string;
  description: string;
}> = [
  {
    value: "generate_leads",
    label: "Generate leads",
    description: "Capture and qualify more inbound prospects.",
  },
  {
    value: "manage_conversations",
    label: "Manage conversations",
    description: "Keep replies organized and fast across chats.",
  },
  {
    value: "close_sales",
    label: "Close sales",
    description: "Move interested buyers toward payment faster.",
  },
  {
    value: "run_campaigns",
    label: "Run campaigns",
    description: "Launch outbound messaging and promotions.",
  },
];

export const trafficSourceOptions: Array<{
  value: TrafficSource;
  label: string;
}> = [
  { value: "ads", label: "Ads" },
  { value: "website", label: "Website" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "other", label: "Other" },
];

export const whatsappModeOptions: Array<{
  value: WhatsappMode;
  label: string;
  eyebrow: string;
  description: string;
  cta: string;
  badge: string;
}> = [
  {
    value: "qr",
    label: "Connect instantly (Scan QR)",
    eyebrow: "Instant Connect",
    description:
      "Best for businesses expecting up to 100 inbound chats a day. No setup friction, just move fast.",
    cta: "Continue with QR",
    badge: "Default",
  },
  {
    value: "api",
    label: "Use Official WhatsApp API",
    eyebrow: "Official API",
    description:
      "Built for higher-volume messaging and future scaling. KYC and approval come next.",
    cta: "Setup Business API",
    badge: "Advanced",
  },
];

export const onboardingSteps = [
  {
    step: 1,
    badge: "Step 1 of 6",
    title: "Business Info",
    headline: "Tell us about your business.",
    description:
      "This is the identity your sales workspace will use — your brand name, contact number, industry, and location.",
  },
  {
    step: 2,
    badge: "Step 2 of 6",
    title: "Revenue Goal",
    headline: "What’s the main outcome you want?",
    description:
      "Pick the single goal that best describes what you want this workspace to drive for your business.",
  },
  {
    step: 3,
    badge: "Step 3 of 6",
    title: "Traffic Sources",
    headline: "Where do your leads come from?",
    description:
      "Select every channel that sends conversations your way so QuicReply can prioritize them correctly.",
  },
  {
    step: 4,
    badge: "Step 4 of 6",
    title: "WhatsApp Connection",
    headline: "Choose how this workspace connects to WhatsApp.",
    description:
      "Start with instant QR for speed, or set up the Official API if you already need high-volume messaging.",
  },
  {
    step: 5,
    badge: "Step 5 of 6",
    title: "AI + Lead Engine",
    headline: "Train the sales brain that will reply, tag, and qualify leads.",
    description:
      "Define your lead capture defaults, tell QuicReply what you sell, and set the first AI greeting your buyers will see.",
  },
  {
    step: 6,
    badge: "Step 6 of 6",
    title: "Completion",
    headline: "Your Revenue Engine is primed and ready to unlock.",
    description:
      "Review the setup before we open the dashboard and hand you the controls.",
  },
] as const;
