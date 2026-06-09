export type AiKnowledgeBase = {
  pricingAndPlans: string;
  seatsAndLimits: string;
  coreFeatures: string;
  productPages: string;
  policiesAndFaqs: string;
};

export const defaultAiKnowledgeBase: AiKnowledgeBase = {
  pricingAndPlans:
    "Starter plan is $99/month and includes 3 agent seats, QR session mode, and no official Meta API. Professional plan is $499/month and includes 10 agent seats, Official Meta API, and Jennifer AI. Enterprise pricing is custom and is positioned for larger teams that need unlimited seats, infinite messaging, and a dedicated success manager. If pricing changes or a quote is needed, Jennifer should say pricing depends on the current plan setup and can hand off to sales.",
  seatsAndLimits:
    "Starter includes 3 agent seats. Professional includes 10 agent seats. Enterprise is positioned as unlimited seats. Jennifer should not invent extra limits like AI credits, billing caps, seat overages, or message caps unless they are explicitly saved here later. When exact usage allowances are unknown, Jennifer should say the workspace owner can confirm the current plan limits in Billing.",
  coreFeatures:
    "QuicReply is built around WhatsApp lead follow-up, customer support, sales conversations, shared inbox collaboration, campaign messaging, AI-assisted replies through Jennifer, contact tracking, and CRM-style pipeline management. Jennifer can draft replies, qualify interest, answer product questions from saved knowledge, and hand off to a human when needed. The AI test sandbox is for simulated replies only and does not send live messages.",
  productPages:
    "Dashboard gives a high-level operating summary. Inbox is the shared conversation workspace for ongoing chats. Contacts stores people, tags, notes, and ownership. Pipeline tracks leads and deal stages. Campaigns is for outbound campaign work and Jennifer reply controls. AI Setup stores Jennifer business context, opening tone, and response controls. Knowledge Base stores the facts Jennifer should rely on. Billing shows plans, invoices, and usage information. WhatsApp setup handles channel connection and provider setup. Analytics focuses on performance and Jennifer-related reporting.",
  policiesAndFaqs:
    "Jennifer should never claim a live action already happened unless the system truly confirmed it. In the AI test sandbox, Jennifer must only draft or simulate the reply. Jennifer should not invent pricing, guarantees, screenshots, proofs, delivery confirmations, or unsupported features. If a user asks for a human, custom quote, or exact account-specific billing detail, Jennifer should hand off cleanly instead of guessing.",
};

export function normalizeAiKnowledgeBase(
  value: Partial<AiKnowledgeBase> | null | undefined,
): AiKnowledgeBase {
  return {
    pricingAndPlans: value?.pricingAndPlans ?? defaultAiKnowledgeBase.pricingAndPlans,
    seatsAndLimits: value?.seatsAndLimits ?? defaultAiKnowledgeBase.seatsAndLimits,
    coreFeatures: value?.coreFeatures ?? defaultAiKnowledgeBase.coreFeatures,
    productPages: value?.productPages ?? defaultAiKnowledgeBase.productPages,
    policiesAndFaqs: value?.policiesAndFaqs ?? defaultAiKnowledgeBase.policiesAndFaqs,
  };
}
