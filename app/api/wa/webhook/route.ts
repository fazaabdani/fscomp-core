import { NextResponse } from "next/server";
import { forbidden, hasFonnteWebhookAccess } from "@/lib/api-auth";
import { parseFonnteInboundWebhook, resolveWaChannelFromDevice, sendFonnteMessage } from "@/lib/fonnte-client";
import { processWaIncomingMessage } from "@/lib/wa-ai-orchestrator";

export const dynamic = "force-dynamic";

/**
 * Endpoint langsung dari Fonnte, tanpa lewat n8n. URL webhook yang didaftarkan ke Fonnte
 * harus pakai query param ?key=<FONNTE_WEBHOOK_SECRET> karena Fonnte tidak kirim header
 * verifikasi apa pun untuk webhook masuk.
 */
export async function POST(request: Request) {
  if (!hasFonnteWebhookAccess(request)) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = parseFonnteInboundWebhook(body);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  if (parsed.isGroupMessage) {
    return NextResponse.json({ ok: true, skipped: true, reason: "group_message" });
  }

  const channel = resolveWaChannelFromDevice(parsed.device);

  const result = await processWaIncomingMessage({
    phone: parsed.phone,
    message: parsed.message,
    customerName: parsed.customerName,
    channel,
    raw: body
  });

  if (result.ok && !result.skipped && result.draftReply) {
    await sendFonnteMessage({ target: parsed.phone, message: result.draftReply });
  }

  return NextResponse.json(result);
}
