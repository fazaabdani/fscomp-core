-- Katalog non-laptop (PC set, PC only, monitor, aksesoris) di InventoryItem. Aditif dan idempoten (IF NOT EXISTS),
-- supaya aman dijalankan manual lebih dulu di produksi lalu dijalankan lagi oleh `prisma migrate deploy`.
DO $$ BEGIN
  CREATE TYPE "ProductCondition" AS ENUM ('SECOND', 'NEW');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "salePrice" INTEGER;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "condition" "ProductCondition" NOT NULL DEFAULT 'SECOND';
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "catalogKind" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "catalogPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "catalogIncludes" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "catalogImageUrl" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "catalogWarrantyNote" TEXT;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "catalogSort" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "InventoryItem_catalogPublic_catalogKind_idx" ON "InventoryItem"("catalogPublic", "catalogKind");
