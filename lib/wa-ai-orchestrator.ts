import type { Prisma, WaLeadScore, WaRiskLevel } from "@prisma/client";
import { prisma } from "./prisma";
import { isWaChannelActive, type WaChannelId } from "./wa-ai-channels";
import { generateWaAiCatalogReply, type WaAiCatalogReplyMessage } from "./wa-ai-catalog-reply";
import {
  buildWaConversationSummary,
  inferLeadScore,
  inferRiskLevel,
  normalizeWaIntent,
  normalizeWaPhone
} from "./wa-ai-incoming";
import { decideWaAiPolicy } from "./wa-ai-policy";
import {
  waAiAdminRequiredMessage,
  waAiBookingBridgeMessage,
  waAiCatalogErrorMessage,
  waAiGeneralServiceBridgeMessage,
  waAiOutsideHoursMessage
} from "./wa-ai-responses";
import {
  formatWaAiTelegramMessage,
  shouldSendWaAiTelegram,
  waAiTelegramDedupeKey
} from "./wa-ai-telegram";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_MESSAGES = 10;

export type WaIncomingInput = {
  phone: string;
  message: string;
  customerName?: string | null;
  intent?: string | null;
  leadScore?: WaLeadScore;
  riskLevel?: WaRiskLevel;
  channel?: WaChannelId | null;
  raw?: unknown;
};

export type WaIncomingResult =
  | { ok: true; skipped: true; reason: "channel_inactive" | "rate_limited" }
  | {
      ok: true;
      skipped: false;
      conversationId: string;
      customerId: string;
      status: string;
      leadScore: WaLeadScore;
      riskLevel: WaRiskLevel;
      intent: string;
      decision: ReturnType<typeof decideWaAiPolicy>;
      eventId: string;
      draftReply: string;
      telegram: { queued: boolean; text: string };
    };

async function responseDraft(input: {
  action: string;
  reason: string;
  outsideOperationalHours: boolean;
  allowSafeCatalog: boolean;
  recentMessages: WaAiCatalogReplyMessage[];
}) {
  if (input.outsideOperationalHours && input.action === "AUTO_REPLY") return waAiOutsideHoursMessage();
  if (input.reason === "general_service_inquiry") return waAiGeneralServiceBridgeMessage();
  if (input.action === "BRIDGE_AND_HANDOVER") return waAiBookingBridgeMessage();
  if (input.reason === "catalog_error") return waAiCatalogErrorMessage();

  if (input.action === "AUTO_REPLY" && input.allowSafeCatalog) {
    const generated = await generateWaAiCatalogReply({ messages: input.recentMessages });
    if (generated) return generated.reply;
    return waAiCatalogErrorMessage();
  }

  if (input.action === "HANDOVER_ADMIN") return waAiAdminRequiredMessage();
  return "";
}

function telegramEventType(input: { action: string; reason: string; riskLevel: string; intent: string }) {
  if (input.riskLevel === "RISK") return "RISK";
  if (input.reason === "hot_lead") return "HOT_SERIOUS";
  if (input.reason === "general_service_inquiry") return "GENERAL_SERVICE";
  if (input.intent === "ADMIN_REQUEST") return "ADMIN_REQUEST";
  if (input.action === "BRIDGE_AND_HANDOVER" || input.action === "HANDOVER_ADMIN") return "WAITING_ADMIN";
  return "NONE";
}

/**
 * Titik masuk tunggal untuk memproses satu pesan WA masuk, dipakai oleh endpoint n8n
 * (app/api/integrations/n8n/wa-incoming) maupun endpoint langsung Fonnte (app/api/wa/webhook)
 * supaya policy engine, rate limit, dan generate balasan AI tidak dobel logic di dua tempat.
 */
export async function processWaIncomingMessage(input: WaIncomingInput): Promise<WaIncomingResult> {
  if (!(await isWaChannelActive(input.channel))) {
    return { ok: true, skipped: true, reason: "channel_inactive" };
  }

  const phone = normalizeWaPhone(input.phone);

  const recentInboundCount = await prisma.waMessage.count({
    where: {
      direction: "INBOUND",
      createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
      conversation: { phone }
    }
  });
  if (recentInboundCount >= RATE_LIMIT_MAX_MESSAGES) {
    return { ok: true, skipped: true, reason: "rate_limited" };
  }

  const now = new Date();
  const intent = normalizeWaIntent(input.intent, input.message);
  const leadScore = inferLeadScore(intent, input.leadScore);
  const riskLevel = inferRiskLevel(intent, input.riskLevel);
  const rawPayload = (input.raw === undefined || input.raw === null ? input : input.raw) as Prisma.InputJsonValue;

  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.waCustomer.upsert({
      where: { phone },
      create: {
        phone,
        name: input.customerName || null,
        customerAiPolicy: "AUTO_SAFE"
      },
      update: {
        ...(input.customerName ? { name: input.customerName } : {})
      }
    });

    const openConversation = await tx.waConversation.findFirst({
      where: {
        customerId: customer.id,
        status: { in: ["OPEN", "PENDING_ADMIN", "WAITING_ADMIN"] }
      },
      orderBy: { updatedAt: "desc" }
    });

    const conversation = openConversation
      ? await tx.waConversation.update({
          where: { id: openConversation.id },
          data: {
            phone,
            leadScore,
            riskLevel,
            intent,
            lastMessageAt: now
          }
        })
      : await tx.waConversation.create({
          data: {
            customerId: customer.id,
            phone,
            leadScore,
            riskLevel,
            intent,
            lastMessageAt: now
          }
        });

    await tx.waMessage.create({
      data: {
        conversationId: conversation.id,
        direction: "INBOUND",
        senderName: input.customerName || null,
        body: input.message,
        rawPayload
      }
    });

    const recentMessages = await tx.waMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { direction: true, body: true }
    });

    const decision = decideWaAiPolicy({
      customerPolicy: customer.customerAiPolicy,
      status: conversation.status,
      leadScore,
      riskLevel,
      intent,
      aiTakeoverAllowed: conversation.aiTakeoverAllowed,
      lastAdminResponseAt: conversation.lastAdminResponseAt
    });

    const summary = buildWaConversationSummary({
      customer,
      conversation,
      intent,
      lastMessage: input.message
    });

    const nextStatus = decision.nextStatus ?? conversation.status;
    const updatedConversation = await tx.waConversation.update({
      where: { id: conversation.id },
      data: {
        status: nextStatus,
        summary
      }
    });

    const event = await tx.waAiEventLog.create({
      data: {
        conversationId: conversation.id,
        eventType: "WA_INCOMING_POLICY_DECISION",
        status: decision.action === "AUTO_REPLY" ? "INFO" : "QUEUED",
        reason: decision.reason,
        payload: {
          action: decision.action,
          nextStatus,
          notifyAdmin: decision.notifyAdmin,
          allowSafeCatalog: decision.allowSafeCatalog,
          outsideOperationalHours: decision.outsideOperationalHours,
          intent,
          leadScore,
          riskLevel
        }
      }
    });

    const notifyEventType = telegramEventType({
      action: decision.action,
      reason: decision.reason,
      riskLevel,
      intent
    });
    const shouldNotify = decision.notifyAdmin && shouldSendWaAiTelegram(notifyEventType);
    const telegramText = shouldNotify
      ? formatWaAiTelegramMessage({
          customerName: customer.name,
          phone,
          leadScore,
          riskLevel,
          intent,
          lastMessage: input.message,
          summary
        })
      : "";

    if (shouldNotify) {
      const dedupeKey = waAiTelegramDedupeKey({
        conversationId: conversation.id,
        eventType: notifyEventType,
        bucket: now.toISOString().slice(0, 13)
      });

      await tx.waTelegramNotificationLog.upsert({
        where: { dedupeKey },
        update: { status: "QUEUED" },
        create: {
          conversationId: conversation.id,
          eventType: notifyEventType,
          dedupeKey,
          status: "QUEUED"
        }
      });
    }

    return {
      customer,
      conversation: updatedConversation,
      decision,
      event,
      summary,
      shouldNotify,
      telegramText,
      recentMessages: recentMessages.slice().reverse()
    };
  });

  const draftReply = await responseDraft({
    action: result.decision.action,
    reason: result.decision.reason,
    outsideOperationalHours: result.decision.outsideOperationalHours,
    allowSafeCatalog: result.decision.allowSafeCatalog,
    recentMessages: result.recentMessages
  });

  if (draftReply) {
    await prisma.waMessage.create({
      data: {
        conversationId: result.conversation.id,
        direction: "AI_OUTBOUND",
        body: draftReply
      }
    });
  }

  return {
    ok: true,
    skipped: false,
    conversationId: result.conversation.id,
    customerId: result.customer.id,
    status: result.conversation.status,
    leadScore,
    riskLevel,
    intent,
    decision: result.decision,
    eventId: result.event.id,
    draftReply,
    telegram: {
      queued: result.shouldNotify,
      text: result.telegramText
    }
  };
}
