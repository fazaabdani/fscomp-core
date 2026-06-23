import { NextResponse } from "next/server";
import { z } from "zod";
import { forbidden, hasIntegrationAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { formatWaAiTelegramMessage } from "@/lib/wa-ai-telegram";

export const dynamic = "force-dynamic";

const maxQueueLimit = 25;

const updateNotificationSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["SENT", "FAILED"]),
  error: z.string().max(500).optional()
});

function queueLimit(request: Request) {
  const url = new URL(request.url);
  const parsed = Number(url.searchParams.get("limit") ?? "10");
  if (!Number.isFinite(parsed) || parsed < 1) return 10;
  return Math.min(Math.floor(parsed), maxQueueLimit);
}

export async function GET(request: Request) {
  if (!hasIntegrationAccess(request, "CORE_INTEGRATION_TOKEN")) return forbidden();

  const notifications = await prisma.waTelegramNotificationLog.findMany({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    take: queueLimit(request),
    include: {
      conversation: {
        include: {
          customer: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      }
    }
  });

  return NextResponse.json({
    ok: true,
    count: notifications.length,
    items: notifications.map((notification) => {
      const conversation = notification.conversation;
      const latestMessage = conversation?.messages[0];
      const text = conversation
        ? formatWaAiTelegramMessage({
            customerName: conversation.customer.name,
            phone: conversation.phone,
            leadScore: conversation.leadScore,
            riskLevel: conversation.riskLevel,
            intent: conversation.intent ?? "-",
            lastMessage: latestMessage?.body ?? "-",
            summary: conversation.summary ?? "-"
          })
        : "[FS Comp AI] Notifikasi WhatsApp tanpa percakapan terkait.";

      return {
        id: notification.id,
        eventType: notification.eventType,
        conversationId: notification.conversationId,
        dedupeKey: notification.dedupeKey,
        createdAt: notification.createdAt,
        text,
        conversation: conversation
          ? {
              phone: conversation.phone,
              status: conversation.status,
              leadScore: conversation.leadScore,
              riskLevel: conversation.riskLevel,
              intent: conversation.intent,
              customerName: conversation.customer.name
            }
          : null
      };
    })
  });
}

export async function POST(request: Request) {
  if (!hasIntegrationAccess(request, "CORE_INTEGRATION_TOKEN")) return forbidden();

  let parsed;
  try {
    parsed = updateNotificationSchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const payload = parsed.data;
  const now = new Date();

  const notification = await prisma.waTelegramNotificationLog.update({
    where: { id: payload.id },
    data: {
      status: payload.status,
      sentAt: payload.status === "SENT" ? now : null,
      error: payload.status === "FAILED" ? payload.error ?? "N8N_SEND_FAILED" : null
    }
  });

  if (notification.conversationId) {
    await prisma.waAiEventLog.create({
      data: {
        conversationId: notification.conversationId,
        eventType: "TELEGRAM_NOTIFICATION_UPDATE",
        status: payload.status,
        reason: payload.status === "SENT" ? "sent_by_n8n" : "failed_by_n8n",
        payload: {
          notificationId: notification.id,
          eventType: notification.eventType,
          error: payload.status === "FAILED" ? payload.error ?? "N8N_SEND_FAILED" : null
        }
      }
    });
  }

  return NextResponse.json({
    ok: true,
    id: notification.id,
    status: notification.status,
    sentAt: notification.sentAt
  });
}
