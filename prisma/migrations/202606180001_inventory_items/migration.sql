CREATE TYPE "InventoryItemStatus" AS ENUM ('STOCK', 'USED_IN_UNIT', 'SOLD', 'RETURNED', 'DAMAGED', 'LOST');

CREATE TYPE "WarrantyDurationUnit" AS ENUM ('DAY', 'WEEK', 'MONTH', 'YEAR');

CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brandModel" TEXT,
    "specification" TEXT,
    "serialNumber" TEXT,
    "supplier" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "invoiceImageUrl" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "arrivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warrantyDuration" INTEGER NOT NULL DEFAULT 0,
    "warrantyDurationUnit" "WarrantyDurationUnit" NOT NULL DEFAULT 'MONTH',
    "status" "InventoryItemStatus" NOT NULL DEFAULT 'STOCK',
    "unitId" TEXT,
    "buyerName" TEXT,
    "buyerPhone" TEXT,
    "costPrice" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryItem_category_status_idx" ON "InventoryItem"("category", "status");
CREATE INDEX "InventoryItem_supplier_idx" ON "InventoryItem"("supplier");
CREATE INDEX "InventoryItem_serialNumber_idx" ON "InventoryItem"("serialNumber");
CREATE INDEX "InventoryItem_purchaseDate_idx" ON "InventoryItem"("purchaseDate");

ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
