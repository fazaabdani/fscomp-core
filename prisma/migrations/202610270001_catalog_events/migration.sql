-- Analitik katalog first-party (kunjungan, klik WhatsApp per unit, pencarian). Idempotent.
CREATE TABLE IF NOT EXISTS "CatalogEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "unitId" TEXT,
    "label" TEXT,
    "query" TEXT,
    "filters" TEXT,
    "resultCount" INTEGER,
    "source" TEXT,
    "medium" TEXT,
    "campaign" TEXT,
    "device" TEXT,

    CONSTRAINT "CatalogEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CatalogEvent_createdAt_idx" ON "CatalogEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "CatalogEvent_type_createdAt_idx" ON "CatalogEvent"("type", "createdAt");
CREATE INDEX IF NOT EXISTS "CatalogEvent_unitId_type_idx" ON "CatalogEvent"("unitId", "type");
