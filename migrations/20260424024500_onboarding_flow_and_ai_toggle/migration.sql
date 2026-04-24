-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "flow" TEXT DEFAULT 'sales',
ADD COLUMN "isAiActive" BOOLEAN NOT NULL DEFAULT true;

-- Backfill
UPDATE "Organization"
SET "flow" = COALESCE("flow", 'sales');
