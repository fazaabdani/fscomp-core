-- Add speaker check for daily QC.
ALTER TABLE "QcHarian" ADD COLUMN "speaker" BOOLEAN NOT NULL DEFAULT true;

-- Add sales/cashier foundation.
CREATE TYPE "SaleLocation" AS ENUM ('WIRADESA', 'KAJEN');

CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "location" "SaleLocation" NOT NULL,
    "soldPrice" INTEGER NOT NULL,
    "costPrice" INTEGER NOT NULL,
    "grossProfit" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "buyerName" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Sale_unitId_key" ON "Sale"("unitId");

ALTER TABLE "Sale" ADD CONSTRAINT "Sale_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
