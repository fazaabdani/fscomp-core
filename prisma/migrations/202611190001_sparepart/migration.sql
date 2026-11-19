-- Stok sparepart per jenis barang dengan jumlah + riwayat mutasi. Aditif dan idempotent.
CREATE TABLE IF NOT EXISTS "SparepartItem" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "brand" TEXT,
  "spec" TEXT,
  "sizeInch" TEXT,
  "resolution" TEXT,
  "pins" TEXT,
  "thickness" TEXT,
  "compat" TEXT,
  "qty" INTEGER NOT NULL DEFAULT 0,
  "minQty" INTEGER NOT NULL DEFAULT 2,
  "costPrice" INTEGER NOT NULL DEFAULT 0,
  "salePrice" INTEGER,
  "location" TEXT,
  "shared" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SparepartItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "SparepartMove" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "delta" INTEGER NOT NULL,
  "qtyAfter" INTEGER NOT NULL,
  "reason" TEXT,
  "byName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SparepartMove_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SparepartItem_category_idx" ON "SparepartItem"("category");
CREATE INDEX IF NOT EXISTS "SparepartItem_shared_category_idx" ON "SparepartItem"("shared","category");
CREATE INDEX IF NOT EXISTS "SparepartMove_itemId_createdAt_idx" ON "SparepartMove"("itemId","createdAt");
DO $$ BEGIN
  ALTER TABLE "SparepartMove" ADD CONSTRAINT "SparepartMove_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "SparepartItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
