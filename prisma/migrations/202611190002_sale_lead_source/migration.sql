-- Asal pembeli pada transaksi penjualan. Aditif dan idempotent.
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "leadSource" TEXT;
