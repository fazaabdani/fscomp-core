CREATE TYPE "Role" AS ENUM ('ADMIN', 'TEKNISI', 'MAGANG');
CREATE TYPE "UnitStatus" AS ENUM ('VERIFIED', 'VERIFIED_WITH_NOTES', 'RECHECK', 'CANDIDATE_RETUR');
CREATE TYPE "QcResult" AS ENUM ('OK', 'NOTES', 'FAIL');
CREATE TYPE "DailyStatus" AS ENUM ('LOLOS', 'LOLOS_DENGAN_CATATAN', 'TIDAK_LOLOS');
CREATE TYPE "PaymentStatus" AS ENUM ('BELUM_JATUH_TEMPO', 'MENDEKATI_TEMPO', 'BUTUH_FOLLOW_UP', 'LUNAS');
CREATE TYPE "AiLogStatus" AS ENUM ('OPEN', 'DONE');
CREATE TYPE "CatalogSyncStatus" AS ENUM ('DRAFT', 'READY', 'SYNCED', 'FAILED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BatchPSI" (
  "id" TEXT NOT NULL,
  "nomorBatch" TEXT NOT NULL,
  "supplier" TEXT NOT NULL,
  "tanggalMasuk" TIMESTAMP(3) NOT NULL,
  "tanggalTempo" TIMESTAMP(3) NOT NULL,
  "statusPembayaran" "PaymentStatus" NOT NULL DEFAULT 'BELUM_JATUH_TEMPO',
  "catatan" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BatchPSI_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Unit" (
  "id" TEXT NOT NULL,
  "nomorUnit" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "supplier" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "processor" TEXT NOT NULL,
  "ram" TEXT NOT NULL,
  "ssd" TEXT NOT NULL,
  "ssdSerial" TEXT,
  "lcdSize" TEXT,
  "lcdResolution" TEXT,
  "isTouchscreen" BOOLEAN NOT NULL DEFAULT false,
  "hargaModal" INTEGER NOT NULL,
  "hargaJualRekomendasi" INTEGER NOT NULL,
  "batteryHealth" INTEGER,
  "ssdHealth" INTEGER,
  "statusObservasi" "UnitStatus" NOT NULL DEFAULT 'RECHECK',
  "tanggalMasuk" TIMESTAMP(3) NOT NULL,
  "tempo" TIMESTAMP(3),
  "catalogLiveUrl" TEXT,
  "soldAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QcAwal" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "checkerId" TEXT NOT NULL,
  "tanggal" TIMESTAMP(3) NOT NULL,
  "status" "UnitStatus" NOT NULL,
  "body" "QcResult" NOT NULL,
  "bodyBroken" "QcResult" NOT NULL,
  "karetBawah" "QcResult" NOT NULL,
  "repaint" "QcResult" NOT NULL,
  "layar" "QcResult" NOT NULL,
  "ukuranLcd" "QcResult" NOT NULL,
  "resolusiLayar" "QcResult" NOT NULL,
  "touchscreen" "QcResult" NOT NULL,
  "keyboard" "QcResult" NOT NULL,
  "touchpad" "QcResult" NOT NULL,
  "trackpoint" "QcResult" NOT NULL,
  "usb" "QcResult" NOT NULL,
  "kamera" "QcResult" NOT NULL,
  "port" "QcResult" NOT NULL,
  "speaker" "QcResult" NOT NULL,
  "mic" "QcResult" NOT NULL,
  "charger" "QcResult" NOT NULL,
  "battery" "QcResult" NOT NULL,
  "ssd" "QcResult" NOT NULL,
  "seriSsd" "QcResult" NOT NULL,
  "osInstalled" "QcResult" NOT NULL,
  "updateOs" "QcResult" NOT NULL,
  "driver" "QcResult" NOT NULL,
  "securityPatch" "QcResult" NOT NULL,
  "aplikasiDefault" "QcResult" NOT NULL,
  "reminder" TEXT[],
  "catatan" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QcAwal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QcHarian" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "checkerId" TEXT NOT NULL,
  "tanggal" TIMESTAMP(3) NOT NULL,
  "ssdHealth" INTEGER NOT NULL,
  "batteryHealth" INTEGER NOT NULL,
  "nyalaNormal" BOOLEAN NOT NULL,
  "booting" BOOLEAN NOT NULL,
  "layar" BOOLEAN NOT NULL,
  "keyboard" BOOLEAN NOT NULL,
  "ssd" BOOLEAN NOT NULL,
  "battery" BOOLEAN NOT NULL,
  "port" BOOLEAN NOT NULL,
  "wifi" BOOLEAN NOT NULL,
  "bluetooth" BOOLEAN NOT NULL,
  "kondisiHariIni" TEXT NOT NULL,
  "masihLolos" "DailyStatus" NOT NULL,
  "catatan" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QcHarian_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiLog" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rekomendasi" TEXT NOT NULL,
  "status" "AiLogStatus" NOT NULL DEFAULT 'OPEN',
  "source" TEXT NOT NULL DEFAULT 'core-ai',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogSync" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "status" "CatalogSyncStatus" NOT NULL DEFAULT 'DRAFT',
  "catalogUrl" TEXT,
  "lastSyncedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogSync_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "BatchPSI_nomorBatch_key" ON "BatchPSI"("nomorBatch");
CREATE UNIQUE INDEX "Unit_nomorUnit_key" ON "Unit"("nomorUnit");
CREATE UNIQUE INDEX "QcAwal_unitId_key" ON "QcAwal"("unitId");

ALTER TABLE "Unit" ADD CONSTRAINT "Unit_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BatchPSI"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QcAwal" ADD CONSTRAINT "QcAwal_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QcAwal" ADD CONSTRAINT "QcAwal_checkerId_fkey" FOREIGN KEY ("checkerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QcHarian" ADD CONSTRAINT "QcHarian_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "QcHarian" ADD CONSTRAINT "QcHarian_checkerId_fkey" FOREIGN KEY ("checkerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiLog" ADD CONSTRAINT "AiLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatalogSync" ADD CONSTRAINT "CatalogSync_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
