ALTER TABLE "BatchPSI" ADD COLUMN "jumlahLaptopDatang" INTEGER;
ALTER TABLE "BatchPSI" ADD COLUMN "jumlahChargerDatang" INTEGER;
ALTER TABLE "BatchPSI" ADD COLUMN "chargerCounts" JSONB;
ALTER TABLE "Unit" ADD COLUMN "chargerType" TEXT;
