CREATE TABLE "UnitAuditLog" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "actorUsername" TEXT,
  "actorRole" TEXT,
  "changes" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UnitAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UnitAuditLog_unitId_createdAt_idx" ON "UnitAuditLog"("unitId", "createdAt");

ALTER TABLE "UnitAuditLog" ADD CONSTRAINT "UnitAuditLog_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
