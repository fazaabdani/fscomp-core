CREATE TYPE "LicenseType" AS ENUM ('OFFICE', 'WINDOWS', 'ANTIVIRUS', 'OTHER');

CREATE TYPE "LicenseDurationType" AS ENUM ('LIFETIME', 'YEARLY', 'CUSTOM');

CREATE TYPE "LicenseStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'SENT', 'PROBLEM', 'REPLACED');

CREATE TABLE "LicenseRecord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "licenseType" "LicenseType" NOT NULL,
    "version" TEXT NOT NULL,
    "edition" TEXT,
    "productKey" TEXT,
    "durationType" "LicenseDurationType" NOT NULL DEFAULT 'LIFETIME',
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "status" "LicenseStatus" NOT NULL DEFAULT 'ASSIGNED',
    "supplier" TEXT,
    "buyerName" TEXT,
    "buyerPhone" TEXT,
    "unitId" TEXT,
    "saleId" TEXT,
    "laptopSeries" TEXT,
    "sourceItemName" TEXT,
    "sourceItemCategory" TEXT,
    "salePrice" INTEGER NOT NULL DEFAULT 0,
    "costPrice" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LicenseRecord_licenseType_status_idx" ON "LicenseRecord"("licenseType", "status");
CREATE INDEX "LicenseRecord_buyerPhone_idx" ON "LicenseRecord"("buyerPhone");
CREATE INDEX "LicenseRecord_unitId_idx" ON "LicenseRecord"("unitId");
CREATE INDEX "LicenseRecord_saleId_idx" ON "LicenseRecord"("saleId");
CREATE INDEX "LicenseRecord_purchaseDate_idx" ON "LicenseRecord"("purchaseDate");

ALTER TABLE "LicenseRecord" ADD CONSTRAINT "LicenseRecord_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LicenseRecord" ADD CONSTRAINT "LicenseRecord_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LicenseRecord" ADD CONSTRAINT "LicenseRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
