CREATE TABLE "Contact" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "source" TEXT NOT NULL DEFAULT 'WhatsApp',
  "status" TEXT NOT NULL DEFAULT 'new-lead',
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "assignedTo" TEXT,
  "notes" TEXT,
  "lastMessage" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "lastMessageDirection" TEXT,
  "avatarColor" TEXT,

  CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Contact_organizationId_phone_key" ON "Contact"("organizationId", "phone");
CREATE INDEX "Contact_organizationId_updatedAt_idx" ON "Contact"("organizationId", "updatedAt");
CREATE INDEX "Contact_organizationId_status_idx" ON "Contact"("organizationId", "status");
CREATE INDEX "Contact_organizationId_source_idx" ON "Contact"("organizationId", "source");

ALTER TABLE "Contact"
ADD CONSTRAINT "Contact_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
