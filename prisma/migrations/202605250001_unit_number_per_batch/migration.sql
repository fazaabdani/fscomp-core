DROP INDEX IF EXISTS "Unit_nomorUnit_key";

CREATE UNIQUE INDEX "Unit_batchId_nomorUnit_key" ON "Unit"("batchId", "nomorUnit");
