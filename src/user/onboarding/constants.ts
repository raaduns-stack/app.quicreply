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

export const onboardingFlowValues = ["sales", "broadcast"] as const;
export const whatsappModeValues = ["qr", "api"] as const;
export const apiStatusValues = ["none", "pending", "approved"] as const;

export type PrimaryGoal = (typeof primaryGoalValues)[number];
export type TrafficSource = (typeof trafficSourceValues)[number];
export type OnboardingFlow = (typeof onboardingFlowValues)[number];
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

export const onboardingFlowOptions: Array<{
  value: OnboardingFlow;
  label: string;
  eyebrow: string;
  description: string;
  points: string[];
}> = [
  {
    value: "sales",
    label: "Sales Generator",
    eyebrow: "Option A",
    description:
      "The core engine for inbound lead capture, live conversations, and closing.",
    points: ["Capture leads", "Handle live chats", "Close sales faster"],
  },
  {
    value: "broadcast",
    label: "Broadcast Engine",
    eyebrow: "Option B",
    description:
      "Built for outbound campaigns, re-engagement, and high-volume messaging.",
    points: ["Bulk outreach", "Re-engagement flows", "Campaign automation"],
  },
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

export const industryOptions = [
  { value: "ecommerce", label: "E-commerce / Retail" },
  { value: "real-estate", label: "Real Estate" },
  { value: "saas", label: "Software / SaaS" },
  { value: "education", label: "Education / Coaching" },
  { value: "healthcare", label: "Healthcare" },
  { value: "services", label: "Services / Agency" },
  { value: "other", label: "Other" },
] as const;

export const countryOptions = [
  { value: "US", label: "United States" },
  { value: "IN", label: "India" },
  { value: "UK", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "other", label: "Other" },
] as const;

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
    headline: "Connect your WhatsApp",
    description:
      "Choose the fast QR path or the advanced Official API path for scaling.",
  },
  {
    step: 5,
    badge: "Step 5 of 6",
    title: "AI + Lead Engine",
    headline: "AI & Lead Engine Setup",
    description:
      "Configure your lead capture rules and train your AI Sales Rep with the context of your offer.",
  },
  {
    step: 6,
    badge: "Step 6 of 6",
    title: "Completion",
    headline: "Revenue Engine Primed",
    description:
      "Your Sales Generator is initialized. Jennifer is now training on your business context and ready to close leads.",
  },
] as const;

export const onboardingFlowContent: Record<
  OnboardingFlow,
  {
    flowLabel: string;
    step1Badge: string;
    step1Headline: string;
    step1Description: string;
    step1Tip: string;
    step2Badge: string;
    step2Description: string;
    step3Headline: string;
    step3Description: string;
    leadRulesTitle: string;
    saveChatsLabel: string;
    saveChatsDescription: string;
    notificationsLabel: string;
    notificationsDescription: string;
    businessContextLabel: string;
    businessContextPlaceholder: string;
    productsLabel: string;
    productsPlaceholder: string;
    firstMessagePlaceholder: string;
    assistantName: string;
    assistantDescription: string;
    trainingTitle: string;
    completionTitle: string;
    completionDescription: string;
    initButtonLabel: string;
  }
> = {
  sales: {
    flowLabel: "Sales Generator",
    step1Badge: "Sales Generator Flow",
    step1Headline: "Business and goal setup",
    step1Description:
      "We will capture your business context, revenue goal, and lead sources before training the AI sales rep.",
    step1Tip:
      "Sales Generator will continue into WhatsApp connection and the AI + lead engine step.",
    step2Badge: "Sales Generator",
    step2Description:
      "Choose how to link your number. QR is instant for inbound closing, while API is built for heavy scaling.",
    step3Headline: "AI & Lead Engine Setup",
    step3Description:
      "Configure your lead capture rules and train your AI Sales Rep with the context of your offer.",
    leadRulesTitle: "A. Lead Capture Rules",
    saveChatsLabel: "Save new chats as leads",
    saveChatsDescription: "Automatically store new prospects.",
    notificationsLabel: "Push Notifications",
    notificationsDescription: "Get notified when a lead is highly active.",
    businessContextLabel: "What do you sell?",
    businessContextPlaceholder: "e.g. Real estate, SaaS...",
    productsLabel: "Product Details",
    productsPlaceholder: "List selling points...",
    firstMessagePlaceholder:
      "Hi there! Thanks for reaching out. Tell me what you need and I’ll guide you from here.",
    assistantName: "Jennifer (Sales AI)",
    assistantDescription:
      "Jennifer is your dedicated Sales Rep. She will handle objections and close deals 24/7.",
    trainingTitle: "Training Jennifer...",
    completionTitle: "Revenue Engine Primed",
    completionDescription:
      "Your Sales Generator is initialized. Jennifer is now training on your business context and ready to close leads.",
    initButtonLabel: "Initialize Sales Engine",
  },
  broadcast: {
    flowLabel: "Broadcast Model",
    step1Badge: "Broadcast Engine Flow",
    step1Headline: "Business and campaign setup",
    step1Description:
      "We will capture your business context, outreach goal, and traffic sources before activating your broadcast engine.",
    step1Tip:
      "Broadcast Engine will continue into WhatsApp connection and the AI broadcast setup step.",
    step2Badge: "Broadcast Model",
    step2Description:
      "Choose how to link your number. QR starts fast for lighter outreach, while API is built for campaigns at scale.",
    step3Headline: "AI Broadcast Engine Setup",
    step3Description:
      "Configure your outreach rules and train the broadcast engine with deep product context for better conversions.",
    leadRulesTitle: "A. Outreach Rules",
    saveChatsLabel: "Save new replies as leads",
    saveChatsDescription: "Capture anyone who replies to your broadcasts.",
    notificationsLabel: "Auto-tagging",
    notificationsDescription: "Tag prospects by interest levels automatically.",
    businessContextLabel: "Main outreach objective?",
    businessContextPlaceholder:
      "e.g. Booking meetings, promoting a holiday sale, or re-engaging old leads...",
    productsLabel: "Deep Product Context",
    productsPlaceholder: "Provide details for the AI to answer questions...",
    firstMessagePlaceholder:
      "Hi! We’re reaching out with something relevant for your business. Reply here and I’ll help with details.",
    assistantName: "Jennifer (Broadcast AI)",
    assistantDescription:
      "Jennifer adapts your offers into persuasive follow-ups so every reply moves closer to conversion.",
    trainingTitle: "Training Broadcast Engine...",
    completionTitle: "Broadcast Engine Primed",
    completionDescription:
      "Your Broadcast Engine is initialized. Jennifer is now training on your offer and ready to power outreach conversations.",
    initButtonLabel: "Initialize Broadcast Engine",
  },
};
