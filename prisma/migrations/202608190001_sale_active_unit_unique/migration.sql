-- Partial unique index: a unit can have at most one active (non-void) sale at a time.
-- Prevents the race-condition duplicate-sale bug from recurring under concurrent requests
-- (the app-level pre-check alone cannot close this window). Voided sales are excluded so a
-- unit can still be re-sold after its previous sale was voided.
CREATE UNIQUE INDEX IF NOT EXISTS "sale_active_unit_idx" ON "Sale"("unitId") WHERE "voidedAt" IS NULL;
