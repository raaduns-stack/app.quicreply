CREATE TABLE "PipelineTemplate" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "PipelineTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PipelineStage" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "templateId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,

  CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Deal" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "organizationId" TEXT NOT NULL,
  "contactId" TEXT,
  "templateId" TEXT NOT NULL,
  "stageId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "phone" TEXT,
  "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" TEXT NOT NULL DEFAULT 'open',
  "priorityLevel" TEXT NOT NULL DEFAULT 'normal',
  "lastInteractionAt" TIMESTAMP(3),
  "notes" TEXT,
  "lastStageChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "wonAt" TIMESTAMP(3),
  "lostAt" TIMESTAMP(3),

  CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PipelineTemplate_organizationId_key_key" ON "PipelineTemplate"("organizationId", "key");
CREATE INDEX "PipelineTemplate_organizationId_isActive_idx" ON "PipelineTemplate"("organizationId", "isActive");
CREATE UNIQUE INDEX "PipelineStage_templateId_slug_key" ON "PipelineStage"("templateId", "slug");
CREATE INDEX "PipelineStage_templateId_sortOrder_idx" ON "PipelineStage"("templateId", "sortOrder");
CREATE INDEX "Deal_organizationId_updatedAt_idx" ON "Deal"("organizationId", "updatedAt");
CREATE INDEX "Deal_organizationId_status_idx" ON "Deal"("organizationId", "status");
CREATE INDEX "Deal_templateId_stageId_idx" ON "Deal"("templateId", "stageId");
CREATE INDEX "Deal_contactId_idx" ON "Deal"("contactId");

ALTER TABLE "PipelineTemplate"
ADD CONSTRAINT "PipelineTemplate_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PipelineStage"
ADD CONSTRAINT "PipelineStage_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "PipelineTemplate"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Deal"
ADD CONSTRAINT "Deal_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Deal"
ADD CONSTRAINT "Deal_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Deal"
ADD CONSTRAINT "Deal_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "PipelineTemplate"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Deal"
ADD CONSTRAINT "Deal_stageId_fkey"
FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
