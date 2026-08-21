-- Optional link from a sold item (SaleItem) to the actual InventoryItem it came from, so
-- selling an accessory/sparepart through the non-laptop kasir can mark that specific inventory
-- row as SOLD instead of leaving inventory status untouched (previously SaleItem was pure free
-- text with no relation to InventoryItem at all).
ALTER TABLE "SaleItem" ADD COLUMN "inventoryItemId" TEXT;
CREATE INDEX "SaleItem_inventoryItemId_idx" ON "SaleItem"("inventoryItemId");
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
