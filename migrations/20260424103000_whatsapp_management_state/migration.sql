-- AlterTable
ALTER TABLE "Organization"
ADD COLUMN "qrCodeData" TEXT,
ADD COLUMN "qrSessionId" TEXT,
ADD COLUMN "qrStatus" TEXT DEFAULT 'disconnected',
ADD COLUMN "qrLastSeen" TIMESTAMP(3),
ADD COLUMN "qrStatusCheckedAt" TIMESTAMP(3),
ADD COLUMN "qrDeviceInfo" TEXT,
ADD COLUMN "apiPhoneNumber" TEXT,
ADD COLUMN "apiMessagingLimit" TEXT;

-- Backfill
UPDATE "Organization"
SET "qrStatus" = CASE
  WHEN "qrConnected" = true THEN 'connected'
  ELSE COALESCE("qrStatus", 'disconnected')
END
WHERE "qrStatus" IS NULL OR "qrConnected" = true;
