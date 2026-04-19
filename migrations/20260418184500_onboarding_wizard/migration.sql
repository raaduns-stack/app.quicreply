-- AlterTable
ALTER TABLE "User"
ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "apiStatus" TEXT DEFAULT 'none',
ADD COLUMN "businessDescription" TEXT,
ADD COLUMN "firstAiMessage" TEXT,
ADD COLUMN "productsServices" TEXT,
ADD COLUMN "qrConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "settings" JSONB,
ADD COLUMN "whatsappMode" TEXT DEFAULT 'qr';

-- Backfill
UPDATE "User"
SET "onboardingStep" = 4
WHERE "onboardingCompleted" = true;
