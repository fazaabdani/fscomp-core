ALTER TABLE "Sale" ADD COLUMN "invoiceNumber" TEXT;
ALTER TABLE "Sale" ADD COLUMN "subtotal" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN "buyerPhone" TEXT;
ALTER TABLE "Sale" ADD COLUMN "warrantySoftware" TEXT NOT NULL DEFAULT '3 bulan';
ALTER TABLE "Sale" ADD COLUMN "warrantyHardware" TEXT NOT NULL DEFAULT '3 minggu';

UPDATE "Sale"
SET
  "invoiceNumber" = 'FS-' || to_char("soldAt", 'YYYYMMDD') || '-' || upper(substr("id", 1, 6)),
  "subtotal" = "soldPrice"
WHERE "invoiceNumber" IS NULL;

ALTER TABLE "Sale" ALTER COLUMN "invoiceNumber" SET NOT NULL;
CREATE UNIQUE INDEX "Sale_invoiceNumber_key" ON "Sale"("invoiceNumber");

CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL DEFAULT 0,
    "lineTotal" INTEGER NOT NULL,
    "lineCost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SaleItem" ("id", "saleId", "name", "category", "qty", "unitPrice", "unitCost", "lineTotal", "lineCost")
SELECT
  'item-' || "id",
  "id",
  'Laptop',
  'LAPTOP',
  1,
  "soldPrice",
  "costPrice",
  "soldPrice",
  "costPrice"
FROM "Sale";

ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
