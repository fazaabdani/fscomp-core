-- Adds an optional provider-side message id to WaMessage so inbound webhook retries (n8n or a
-- future provider payload that supplies one) can be deduped instead of creating duplicate
-- messages / duplicate AI processing. Nullable + unique: Postgres allows any number of NULLs,
-- only non-null values must be unique, so this doesn't affect rows without a known provider id.
ALTER TABLE "WaMessage" ADD COLUMN "providerMessageId" TEXT;
CREATE UNIQUE INDEX "WaMessage_providerMessageId_key" ON "WaMessage"("providerMessageId");
