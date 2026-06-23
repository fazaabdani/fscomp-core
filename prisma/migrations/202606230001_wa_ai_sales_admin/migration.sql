CREATE TYPE "WaCustomerAiPolicy" AS ENUM ('AUTO_SAFE', 'ADMIN_ONLY', 'VIP_ADMIN_ONLY', 'BLOCKED_AI');
CREATE TYPE "WaConversationStatus" AS ENUM ('OPEN', 'PENDING_ADMIN', 'WAITING_ADMIN', 'CLOSED', 'DEAL', 'LOST', 'ARCHIVED');
CREATE TYPE "WaLeadScore" AS ENUM ('COLD', 'WARM', 'HOT');
CREATE TYPE "WaRiskLevel" AS ENUM ('SAFE', 'WATCH', 'RISK');
CREATE TYPE "WaMessageDirection" AS ENUM ('INBOUND', 'AI_OUTBOUND', 'ADMIN_OUTBOUND', 'SYSTEM');
CREATE TYPE "WaAiEventStatus" AS ENUM ('INFO', 'SKIPPED', 'QUEUED', 'SENT', 'FAILED');

CREATE TABLE "WaCustomer" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "name" TEXT,
  "customerAiPolicy" "WaCustomerAiPolicy" NOT NULL DEFAULT 'AUTO_SAFE',
  "isKnownCustomer" BOOLEAN NOT NULL DEFAULT false,
  "lastDealAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WaCustomer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WaConversation" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "status" "WaConversationStatus" NOT NULL DEFAULT 'OPEN',
  "leadScore" "WaLeadScore" NOT NULL DEFAULT 'COLD',
  "riskLevel" "WaRiskLevel" NOT NULL DEFAULT 'SAFE',
  "intent" TEXT,
  "summary" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "lastAdminResponseAt" TIMESTAMP(3),
  "lastAiResponseAt" TIMESTAMP(3),
  "aiTakeoverAllowed" BOOLEAN NOT NULL DEFAULT true,
  "followupPassiveSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WaConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WaMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "direction" "WaMessageDirection" NOT NULL,
  "senderName" TEXT,
  "body" TEXT NOT NULL,
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WaAiSetting" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WaAiSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WaAiEventLog" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT,
  "eventType" TEXT NOT NULL,
  "status" "WaAiEventStatus" NOT NULL DEFAULT 'INFO',
  "reason" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaAiEventLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WaTelegramNotificationLog" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT,
  "eventType" TEXT NOT NULL,
  "dedupeKey" TEXT,
  "sentAt" TIMESTAMP(3),
  "status" "WaAiEventStatus" NOT NULL DEFAULT 'QUEUED',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WaTelegramNotificationLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WaCustomer_phone_key" ON "WaCustomer"("phone");
CREATE INDEX "WaCustomer_customerAiPolicy_idx" ON "WaCustomer"("customerAiPolicy");
CREATE INDEX "WaCustomer_isKnownCustomer_updatedAt_idx" ON "WaCustomer"("isKnownCustomer", "updatedAt");

CREATE INDEX "WaConversation_status_updatedAt_idx" ON "WaConversation"("status", "updatedAt");
CREATE INDEX "WaConversation_phone_updatedAt_idx" ON "WaConversation"("phone", "updatedAt");
CREATE INDEX "WaConversation_leadScore_riskLevel_idx" ON "WaConversation"("leadScore", "riskLevel");
CREATE INDEX "WaConversation_customerId_updatedAt_idx" ON "WaConversation"("customerId", "updatedAt");

CREATE INDEX "WaMessage_conversationId_createdAt_idx" ON "WaMessage"("conversationId", "createdAt");
CREATE INDEX "WaMessage_direction_createdAt_idx" ON "WaMessage"("direction", "createdAt");

CREATE UNIQUE INDEX "WaAiSetting_key_key" ON "WaAiSetting"("key");

CREATE INDEX "WaAiEventLog_conversationId_createdAt_idx" ON "WaAiEventLog"("conversationId", "createdAt");
CREATE INDEX "WaAiEventLog_eventType_createdAt_idx" ON "WaAiEventLog"("eventType", "createdAt");
CREATE INDEX "WaAiEventLog_status_createdAt_idx" ON "WaAiEventLog"("status", "createdAt");

CREATE UNIQUE INDEX "WaTelegramNotificationLog_dedupeKey_key" ON "WaTelegramNotificationLog"("dedupeKey");
CREATE INDEX "WaTelegramNotificationLog_conversationId_createdAt_idx" ON "WaTelegramNotificationLog"("conversationId", "createdAt");
CREATE INDEX "WaTelegramNotificationLog_eventType_createdAt_idx" ON "WaTelegramNotificationLog"("eventType", "createdAt");
CREATE INDEX "WaTelegramNotificationLog_status_createdAt_idx" ON "WaTelegramNotificationLog"("status", "createdAt");

ALTER TABLE "WaConversation" ADD CONSTRAINT "WaConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "WaCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaMessage" ADD CONSTRAINT "WaMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WaConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaAiEventLog" ADD CONSTRAINT "WaAiEventLog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WaConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WaTelegramNotificationLog" ADD CONSTRAINT "WaTelegramNotificationLog_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WaConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "WaAiSetting" ("id", "key", "value", "updatedAt")
VALUES
  ('wa_ai_setting_ai_enabled', 'ai_enabled', 'true'::jsonb, CURRENT_TIMESTAMP),
  ('wa_ai_setting_safe_auto_reply_only', 'safe_auto_reply_only', 'true'::jsonb, CURRENT_TIMESTAMP),
  ('wa_ai_setting_pending_only', 'pending_only', 'false'::jsonb, CURRENT_TIMESTAMP),
  ('wa_ai_setting_followup_passive', 'followup_passive', 'false'::jsonb, CURRENT_TIMESTAMP),
  ('wa_ai_setting_active_24_hours', 'active_24_hours', 'true'::jsonb, CURRENT_TIMESTAMP),
  ('wa_ai_setting_outside_hours_message', 'outside_hours_message_enabled', 'true'::jsonb, CURRENT_TIMESTAMP),
  ('wa_ai_setting_operational_hours', 'store_operational_hours', '{"timezone":"Asia/Jakarta","days":[{"day":1,"open":"08:00","close":"21:00"},{"day":2,"open":"08:00","close":"21:00"},{"day":3,"open":"08:00","close":"21:00"},{"day":4,"open":"08:00","close":"21:00"},{"day":5,"open":"08:00","close":"21:00"},{"day":6,"open":"08:00","close":"21:00"},{"day":0,"open":"08:00","close":"21:00"}]}'::jsonb, CURRENT_TIMESTAMP),
  ('wa_ai_setting_product_source', 'product_source', '"core_catalog"'::jsonb, CURRENT_TIMESTAMP),
  ('wa_ai_setting_new_customer_policy', 'new_customer_policy', '"AUTO_SAFE"'::jsonb, CURRENT_TIMESTAMP),
  ('wa_ai_setting_known_customer_policy_after_deal', 'known_customer_policy_after_deal', '"ADMIN_ONLY"'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
