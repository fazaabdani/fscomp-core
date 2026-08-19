import { NextResponse } from "next/server";
import { forbidden, hasIntegrationAccess } from "@/lib/api-auth";
import { sendFonnteMessage } from "@/lib/fonnte-client";
import { prisma } from "@/lib/prisma";
import {
  generateWaAiFollowUpMessage,
  getWaFollowUpHours,
  getWaFollowUpMode,
  isConversationDueForFollowUp
} from "@/lib/wa-ai-followup";

export const dynamic = "force-dynamic";

/**
 * Dipanggil dari luar secara berkala (mis. Coolify Scheduled Task atau n8n Schedule Trigger
 * yang cuma hit URL ini, tanpa logic apa pun di situ — sama seperti prinsip di Tahap 8).
 * Hanya benar-benar mengirim kalau follow_up_mode = AUTO; selain itu no-op.
 */
export async function POST(request: Request) {
  if (!hasIntegrationAccess(request, "CORE_INTEGRATION_TOKEN")) return forbidden();

  const mode = await getWaFollowUpMode();
  if (mode !== "AUTO") {
    return NextResponse.json({ ok: true, skipped: true, reason: `mode_${mode.toLowerCase()}` });
  }

  const hours = await getWaFollowUpHours();
  const candidates = await prisma.waConversation.findMany({
    where: {
      status: { in: ["OPEN", "PENDING_ADMIN"] },
      followupPassiveSentAt: null,
      customer: { customerAiPolicy: "AUTO_SAFE" }
    },
    include: {
      customer: true,
      messages: { orderBy: { createdAt: "desc" }, take: 10 }
    },
    take: 100
  });

  const results: Array<{ conversationId: string; sent: boolean }> = [];

  for (const conversation of candidates) {
    const latest = conversation.messages[0];
    const due = isConversationDueForFollowUp({
      status: conversation.status,
      leadScore: conversation.leadScore,
      lastMessageAt: conversation.lastMessageAt,
      lastMessageDirection: latest?.direction ?? null,
      followupPassiveSentAt: conversation.followupPassiveSentAt,
      hours
    });
    if (!due) continue;

    const message = await generateWaAiFollowUpMessage({
      messages: conversation.messages.slice().reverse(),
      customerName: conversation.customer.name
    });
    if (!message) continue;

    // Claim atomically right before sending so a concurrent sweep run can't send a duplicate
    // follow-up for the same conversation (TOCTOU window between read and send).
    const claimed = await prisma.waConversation.updateMany({
      where: { id: conversation.id, followupPassiveSentAt: null },
      data: { followupPassiveSentAt: new Date() }
    });
    if (claimed.count === 0) continue;

    const sent = await sendFonnteMessage({ target: conversation.phone, message });

    await prisma.$transaction([
      prisma.waMessage.create({
        data: { conversationId: conversation.id, direction: "AI_OUTBOUND", body: message }
      }),
      prisma.waAiEventLog.create({
        data: {
          conversationId: conversation.id,
          eventType: "AUTO_FOLLOWUP_SENT",
          status: sent ? "SENT" : "FAILED",
          reason: "follow_up_sweep",
          payload: { leadScore: conversation.leadScore }
        }
      })
    ]);

    results.push({ conversationId: conversation.id, sent });
  }

  return NextResponse.json({
    ok: true,
    mode,
    checked: candidates.length,
    followedUp: results.length,
    results
  });
}
