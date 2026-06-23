import type {
  WaConversation,
  WaCustomer,
  WaLeadScore,
  WaRiskLevel
} from "@prisma/client";
import { z } from "./form-validation";
import { inferWaAiIntent, type WaAiIntent } from "./wa-ai-policy";

export const waIncomingPayloadSchema = z.object({
  phone: z.string().trim().min(6).max(30),
  message: z.string().trim().min(1).max(4000),
  customerName: z.string().trim().max(120).optional().nullable(),
  messageId: z.string().trim().max(200).optional().nullable(),
  timestamp: z.string().trim().max(80).optional().nullable(),
  intent: z.string().trim().max(80).optional().nullable(),
  leadScore: z.enum(["COLD", "WARM", "HOT"]).optional(),
  riskLevel: z.enum(["SAFE", "WATCH", "RISK"]).optional(),
  raw: z.unknown().optional()
});

export type WaIncomingPayload = z.infer<typeof waIncomingPayloadSchema>;

export function normalizeWaPhone(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export function normalizeWaIntent(value: string | null | undefined, message: string): WaAiIntent {
  const normalized = String(value ?? "").trim().toUpperCase();
  const known = new Set<WaAiIntent>([
    "GREETING",
    "CATALOG",
    "ADDRESS",
    "HOURS",
    "GENERAL_SERVICE",
    "STOCK_SIMPLE",
    "HOT_LEAD",
    "PAYMENT",
    "NEGOTIATION",
    "COMPLAINT",
    "WARRANTY",
    "REFUND",
    "ADMIN_REQUEST",
    "UNKNOWN"
  ]);
  return known.has(normalized as WaAiIntent) ? normalized as WaAiIntent : inferWaAiIntent(message);
}

export function inferLeadScore(intent: WaAiIntent, explicit?: WaLeadScore): WaLeadScore {
  if (explicit) return explicit;
  if (intent === "HOT_LEAD") return "HOT";
  if (intent === "CATALOG" || intent === "STOCK_SIMPLE" || intent === "NEGOTIATION") return "WARM";
  return "COLD";
}

export function inferRiskLevel(intent: WaAiIntent, explicit?: WaRiskLevel): WaRiskLevel {
  if (explicit) return explicit;
  if (intent === "COMPLAINT" || intent === "REFUND" || intent === "WARRANTY") return "RISK";
  if (intent === "PAYMENT" || intent === "ADMIN_REQUEST") return "WATCH";
  return "SAFE";
}

export function buildWaConversationSummary(input: {
  customer: WaCustomer;
  conversation: WaConversation;
  intent: WaAiIntent;
  lastMessage: string;
}) {
  return [
    `Customer ${input.customer.name || input.customer.phone}`,
    `policy ${input.customer.customerAiPolicy}`,
    `status ${input.conversation.status}`,
    `intent ${input.intent}`,
    `pesan terakhir: ${input.lastMessage.slice(0, 240)}`
  ].join(" / ");
}
