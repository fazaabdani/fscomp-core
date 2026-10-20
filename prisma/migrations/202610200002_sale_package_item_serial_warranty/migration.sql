-- Nota paket (PC rakitan): mode paket per transaksi + serial number & garansi per baris item.
-- Idempotent: aman dijalankan ulang (kolom bisa saja sudah dibuat manual sebelum deploy).
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "packageMode" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "warrantyNote" TEXT;
