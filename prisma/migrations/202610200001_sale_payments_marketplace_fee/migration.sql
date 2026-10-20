-- Potongan admin marketplace (Shopee/Tokopedia/TikTok) per transaksi + riwayat pembayaran (DP -> pelunasan).
-- Idempotent: aman dijalankan ulang (mis. kalau kolom/tabel sudah dibuat manual sebelum deploy).
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "marketplaceName" TEXT;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "marketplaceFee" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "SalePayment" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SalePayment_saleId_idx" ON "SalePayment"("saleId");

DO $$ BEGIN
    ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
