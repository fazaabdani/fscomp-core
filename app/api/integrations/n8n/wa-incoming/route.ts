import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { forbidden, hasIntegrationAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import {
  buildWaConversationSummary,
  inferLeadScore,
  inferRiskLevel,
  normalizeWaIntent,
  normalizeWaPhone,
  waIncomingPayloadSchema
} from "@/lib/wa-ai-incoming";
import { decideWaAiPolicy } from "@/lib/wa-ai-policy";
import {
  waAiAdminRequiredMessage,
  waAiBookingBridgeMessage,
  waAiCatalogErrorMessage,
  waAiOutsideHoursMessage
} from "@/lib/wa-ai-responses";
import {
  formatWaAiTelegramMessage,
  shouldSendWaAiTelegram,
  waAiTelegramDedupeKey
} from "@/lib/wa-ai-telegram";

export const dynamic = "force-dynamic";

function responseDraft(input: {
  action: string;
  reason: string;
  outsideOperationalHours: boolean;
}) {
  if (input.outsideOperationalHours && input.action === "AUTO_REPLY") return waAiOutsideHoursMessage();
  if (input.action === "BRIDGE_AND_HANDOVER") return waAiBookingBridgeMessage();
  if (input.reason === "catalog_error") return waAiCatalogErrorMessage();
  if (input.action === "HANDOVER_ADMIN") return waAiAdminRequiredMessage();
  return "";
}

function telegramEventType(input: { action: string; reason: string; riskLevel: string; intent: string }) {
  if (input.riskLevel === "RISK") return "RISK";
  if (input.reason === "hot_lead") return "HOT_SERIOUS";
  if (input.intent === "ADMIN_REQUEST") return "ADMIN_REQUEST";
  if (input.action === "BRIDGE_AND_HANDOVER" || input.action === "HANDOVER_ADMIN") return "WAITING_ADMIN";
  return "NONE";
}

export async function POST(request: Request) {
  if (!hasIntegrationAccess(request, "CORE_INTEGRATION_TOKEN")) return forbidden();

  let parsed;
  try {
    parsed = waIncomingPayloadSchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const payload = parsed.data;
  const phone = normalizeWaPhone(payload.phone);
  const now = new Date();
  const intent = normalizeWaIntent(payload.intent, payload.message);
  const leadScore = inferLeadScore(intent, payload.leadScore);
  const riskLevel = inferRiskLevel(intent, payload.riskLevel);
  const rawPayload = (payload.raw === undefined || payload.raw === null ? payload : payload.raw) as Prisma.InputJsonValue;

  const result = await prisma.$transaction(async (tx) => {
    const customer = await tx.waCustomer.upsert({
      where: { phone },
      create: {
        phone,
        name: payload.customerName || null,
        customerAiPolicy: "AUTO_SAFE"
      },
      update: {
        ...(payload.customerName ? { name: payload.customerName } : {})
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
        senderName: payload.customerName || null,
        body: payload.message,
        rawPayload
      }
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
      lastMessage: payload.message
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
          lastMessage: payload.message,
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
      telegramText
    };
  });

  const draftReply = responseDraft({
    action: result.decision.action,
    reason: result.decision.reason,
    outsideOperationalHours: result.decision.outsideOperationalHours
  });

  return NextResponse.json({
    ok: true,
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
  });
}
