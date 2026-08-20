import { NextResponse } from "next/server";
import { forbidden, hasIntegrationAccess } from "@/lib/api-auth";
import { waIncomingPayloadSchema } from "@/lib/wa-ai-incoming";
import { processWaIncomingMessage } from "@/lib/wa-ai-orchestrator";

export const dynamic = "force-dynamic";

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

  const result = await processWaIncomingMessage({
    phone: payload.phone,
    message: payload.message,
    customerName: payload.customerName,
    intent: payload.intent,
    leadScore: payload.leadScore,
    riskLevel: payload.riskLevel,
    channel: payload.channel,
    messageId: payload.messageId,
    raw: payload.raw
  });

  return NextResponse.json(result);
}
