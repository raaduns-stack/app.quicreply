import { randomUUID } from "crypto";

export const whatsappQrStatusValues = [
  "disconnected",
  "pending",
  "connected",
  "expired",
  "failed",
] as const;

export type WhatsAppQrStatus = (typeof whatsappQrStatusValues)[number];

type MockQrSessionResponse = {
  sessionId: string | null;
  qrCodeData: string | null;
  qrStatus: WhatsAppQrStatus;
  deviceInfo: string | null;
  lastSeen: Date | null;
  apiPhoneNumber: string | null;
  apiMessagingLimit: string | null;
};

const MOCK_QR_CONNECT_DELAY_MS = 10_000;

function createMockSessionId() {
  return `mock-evolution-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function getSessionStartedAt(sessionId: string | null) {
  if (!sessionId) {
    return null;
  }

  const parts = sessionId.split("-");
  const timestamp = Number(parts[2]);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function createMockQrSvg() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none">
      <rect width="320" height="320" rx="32" fill="#FFF8F0"/>
      <rect x="28" y="28" width="264" height="264" rx="24" fill="white" stroke="#F3D4B0" stroke-width="2"/>
      <rect x="52" y="52" width="70" height="70" rx="12" fill="#FF981F"/>
      <rect x="66" y="66" width="42" height="42" rx="8" fill="white"/>
      <rect x="198" y="52" width="70" height="70" rx="12" fill="#FF981F"/>
      <rect x="212" y="66" width="42" height="42" rx="8" fill="white"/>
      <rect x="52" y="198" width="70" height="70" rx="12" fill="#FF981F"/>
      <rect x="66" y="212" width="42" height="42" rx="8" fill="white"/>
      <rect x="150" y="150" width="20" height="20" rx="6" fill="#FF981F"/>
      <rect x="182" y="150" width="20" height="20" rx="6" fill="#FF981F"/>
      <rect x="150" y="182" width="20" height="20" rx="6" fill="#FF981F"/>
      <rect x="182" y="182" width="20" height="20" rx="6" fill="#FF981F"/>
      <rect x="214" y="182" width="20" height="20" rx="6" fill="#FF981F"/>
      <rect x="150" y="214" width="20" height="20" rx="6" fill="#FF981F"/>
      <rect x="214" y="214" width="20" height="20" rx="6" fill="#FF981F"/>
      <rect x="182" y="246" width="20" height="20" rx="6" fill="#FF981F"/>
      <text x="160" y="302" text-anchor="middle" fill="#7C6A58" font-size="16" font-family="Arial, sans-serif">
        Mock Evolution QR
      </text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function startMockWhatsAppQrSession(): Promise<MockQrSessionResponse> {
  return {
    sessionId: createMockSessionId(),
    qrCodeData: createMockQrSvg(),
    qrStatus: "pending",
    deviceInfo: null,
    lastSeen: null,
    apiPhoneNumber: null,
    apiMessagingLimit: null,
  };
}

export async function getMockWhatsAppQrStatus(
  sessionId: string,
): Promise<MockQrSessionResponse> {
  const startedAt = getSessionStartedAt(sessionId) ?? Date.now();
  const elapsed = Date.now() - startedAt;

  if (elapsed >= MOCK_QR_CONNECT_DELAY_MS) {
    return {
      sessionId,
      qrCodeData: null,
      qrStatus: "connected",
      deviceInfo: "Broadcast Device · Mock Evolution Session",
      lastSeen: new Date(),
      apiPhoneNumber: null,
      apiMessagingLimit: null,
    };
  }

  return {
    sessionId,
    qrCodeData: createMockQrSvg(),
    qrStatus: "pending",
    deviceInfo: null,
    lastSeen: null,
    apiPhoneNumber: null,
    apiMessagingLimit: null,
  };
}
