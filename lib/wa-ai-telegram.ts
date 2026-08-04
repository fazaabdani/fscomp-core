import type { WaLeadScore, WaRiskLevel } from "@prisma/client";
import type { WaAiIntent } from "./wa-ai-policy";

export type WaAiTelegramNotification = {
  customerName?: string | null;
  phone: string;
  leadScore: WaLeadScore;
  riskLevel: WaRiskLevel;
  intent: WaAiIntent | string;
  lastMessage: string;
  summary: string;
};

const telegramAllowedEvents = new Set([
  "HOT_SERIOUS",
  "RISK",
  "CATALOG_API_ERROR",
  "AI_ERROR",
  "ADMIN_REQUEST",
  "WAITING_ADMIN",
  "GENERAL_SERVICE"
]);

export function shouldSendWaAiTelegram(eventType: string) {
  return telegramAllowedEvents.has(eventType);
}

export function waAiTelegramDedupeKey(input: {
  conversationId?: string | null;
  eventType: string;
  bucket?: string;
}) {
  return [input.conversationId ?? "no-conversation", input.eventType, input.bucket ?? "current"].join(":");
}

export function formatWaAiTelegramMessage(input: WaAiTelegramNotification) {
  return [
    "[FS Comp AI] Butuh Admin",
    "",
    `Nama      : ${input.customerName || "-"}`,
    `No WA     : ${input.phone}`,
    `Lead      : ${input.leadScore}`,
    `Risk      : ${input.riskLevel}`,
    `Intent    : ${input.intent}`,
    `Pesan     : ${input.lastMessage}`,
    `Ringkasan : ${input.summary}`,
    "Aksi      : Buka percakapan dan ambil alih jika perlu."
  ].join("\n");
}
