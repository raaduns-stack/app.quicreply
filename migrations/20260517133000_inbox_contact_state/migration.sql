ALTER TABLE "Contact"
ADD COLUMN "isAiActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "unreadCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastReadAt" TIMESTAMP(3),
ADD COLUMN "resolvedAt" TIMESTAMP(3);

CREATE INDEX "Contact_organizationId_lastMessageAt_idx" ON "Contact"("organizationId", "lastMessageAt");
CREATE INDEX "Contact_organizationId_resolvedAt_idx" ON "Contact"("organizationId", "resolvedAt");
