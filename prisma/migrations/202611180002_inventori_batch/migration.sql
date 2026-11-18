-- Barang Inventori (non-laptop) boleh ditautkan ke batch kiriman supplier. Aditif dan idempotent.
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "batchId" TEXT;
CREATE INDEX IF NOT EXISTS "InventoryItem_batchId_idx" ON "InventoryItem"("batchId");
DO $$ BEGIN
  ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BatchPSI"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
