CREATE TYPE "PcComponentCategory" AS ENUM ('CPU', 'MOTHERBOARD', 'RAM', 'STORAGE', 'GPU', 'PSU', 'CASING', 'COOLER', 'MONITOR', 'ACCESSORY');
CREATE TYPE "PcBuildDraftStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTED', 'CONFIRMED', 'CANCELLED');

CREATE TABLE "PcComponent" (
  "id" TEXT NOT NULL, "inventoryItemId" TEXT, "category" "PcComponentCategory" NOT NULL,
  "name" TEXT NOT NULL, "brand" TEXT, "specification" TEXT, "salePrice" INTEGER NOT NULL,
  "socket" TEXT, "memoryType" TEXT, "formFactor" TEXT, "wattage" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PcComponent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PcBuildPreset" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT,
  "useCase" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PcBuildPreset_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PcBuildPresetItem" (
  "id" TEXT NOT NULL, "presetId" TEXT NOT NULL, "componentId" TEXT NOT NULL,
  CONSTRAINT "PcBuildPresetItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PcBuildDraft" (
  "id" TEXT NOT NULL, "referenceCode" TEXT NOT NULL, "presetName" TEXT, "customerName" TEXT,
  "customerPhone" TEXT, "need" TEXT, "budget" INTEGER, "totalPrice" INTEGER NOT NULL,
  "status" "PcBuildDraftStatus" NOT NULL DEFAULT 'NEW', "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PcBuildDraft_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PcBuildDraftItem" (
  "id" TEXT NOT NULL, "draftId" TEXT NOT NULL, "componentId" TEXT, "category" TEXT NOT NULL,
  "componentName" TEXT NOT NULL, "unitPrice" INTEGER NOT NULL,
  CONSTRAINT "PcBuildDraftItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PcComponent_inventoryItemId_key" ON "PcComponent"("inventoryItemId");
CREATE INDEX "PcComponent_category_active_sortOrder_idx" ON "PcComponent"("category", "active", "sortOrder");
CREATE UNIQUE INDEX "PcBuildPreset_name_key" ON "PcBuildPreset"("name");
CREATE UNIQUE INDEX "PcBuildPreset_slug_key" ON "PcBuildPreset"("slug");
CREATE UNIQUE INDEX "PcBuildPresetItem_presetId_componentId_key" ON "PcBuildPresetItem"("presetId", "componentId");
CREATE UNIQUE INDEX "PcBuildDraft_referenceCode_key" ON "PcBuildDraft"("referenceCode");
CREATE INDEX "PcBuildDraft_status_createdAt_idx" ON "PcBuildDraft"("status", "createdAt");
CREATE INDEX "PcBuildDraftItem_draftId_idx" ON "PcBuildDraftItem"("draftId");

ALTER TABLE "PcComponent" ADD CONSTRAINT "PcComponent_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PcBuildPresetItem" ADD CONSTRAINT "PcBuildPresetItem_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "PcBuildPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PcBuildPresetItem" ADD CONSTRAINT "PcBuildPresetItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "PcComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PcBuildDraftItem" ADD CONSTRAINT "PcBuildDraftItem_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "PcBuildDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
