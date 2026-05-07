-- Store the Evolution API instance identity and latest QR provider error.
ALTER TABLE "Organization"
ADD COLUMN "evolutionInstanceName" TEXT,
ADD COLUMN "evolutionInstanceId" TEXT,
ADD COLUMN "qrLastError" TEXT;
