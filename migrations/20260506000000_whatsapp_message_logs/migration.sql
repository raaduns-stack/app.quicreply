CREATE TABLE "WhatsAppMessageLog" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,
  "instanceName" TEXT,
  "direction" TEXT NOT NULL,
  "from" TEXT,
  "to" TEXT,
  "pushName" TEXT,
  "messageType" TEXT,
  "text" TEXT,
  "status" TEXT,
  "source" TEXT,
  "providerEvent" TEXT,
  "providerMessageId" TEXT,
  "rawPayload" JSONB,

  CONSTRAINT "WhatsAppMessageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhatsAppMessageLog_organizationId_createdAt_idx" ON "WhatsAppMessageLog"("organizationId", "createdAt");
CREATE INDEX "WhatsAppMessageLog_instanceName_createdAt_idx" ON "WhatsAppMessageLog"("instanceName", "createdAt");

ALTER TABLE "WhatsAppMessageLog"
ADD CONSTRAINT "WhatsAppMessageLog_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
