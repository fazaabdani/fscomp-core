import type { WaConversationStatus, WaLeadScore, WaMessageDirection } from "@prisma/client";
import { prisma } from "./prisma";
import { getWaAiPersonaPrompt } from "./wa-ai-catalog-reply";

export type WaFollowUpMode = "OFF" | "SEMI" | "AUTO";

export type WaFollowUpHours = {
  hot: number;
  warm: number;
  cold: number;
};

export const defaultWaFollowUpHours: WaFollowUpHours = { hot: 2, warm: 6, cold: 24 };

const eligibleStatuses: WaConversationStatus[] = ["OPEN", "PENDING_ADMIN"];

export async function getWaFollowUpMode(): Promise<WaFollowUpMode> {
  const setting = await prisma.waAiSetting.findUnique({ where: { key: "follow_up_mode" } });
  const value = typeof setting?.value === "string" ? setting.value : "OFF";
  return value === "AUTO" || value === "SEMI" ? value : "OFF";
}

export async function getWaFollowUpHours(): Promise<WaFollowUpHours> {
  const setting = await prisma.waAiSetting.findUnique({ where: { key: "follow_up_hours" } });
  const value = (setting?.value ?? {}) as Partial<WaFollowUpHours>;
  return {
    hot: typeof value.hot === "number" ? value.hot : defaultWaFollowUpHours.hot,
    warm: typeof value.warm === "number" ? value.warm : defaultWaFollowUpHours.warm,
    cold: typeof value.cold === "number" ? value.cold : defaultWaFollowUpHours.cold
  };
}

export function thresholdHoursFor(leadScore: WaLeadScore, hours: WaFollowUpHours) {
  if (leadScore === "HOT") return hours.hot;
  if (leadScore === "WARM") return hours.warm;
  return hours.cold;
}

/**
 * Layak di-follow-up kalau: percakapan masih aktif (belum ditutup/diambil alih penuh admin),
 * belum pernah di-follow-up sebelumnya, pesan terakhir bukan dari pelanggan (giliran kita
 * yang bicara terakhir, pelanggan yang diam — bukan kita yang belum sempat balas), dan sudah
 * lewat ambang jam sesuai lead score-nya.
 */
export function isConversationDueForFollowUp(input: {
  status: WaConversationStatus;
  leadScore: WaLeadScore;
  lastMessageAt: Date | null;
  lastMessageDirection: WaMessageDirection | null;
  followupPassiveSentAt: Date | null;
  hours: WaFollowUpHours;
  now?: Date;
}): boolean {
  if (!eligibleStatuses.includes(input.status)) return false;
  if (input.followupPassiveSentAt) return false;
  if (!input.lastMessageAt) return false;
  if (input.lastMessageDirection === "INBOUND") return false;

  const hours = thresholdHoursFor(input.leadScore, input.hours);
  const dueAt = new Date(input.lastMessageAt.getTime() + hours * 60 * 60 * 1000);
  return (input.now ?? new Date()) >= dueAt;
}

const hardFollowUpRules = [
  "Kamu admin sales FS Comp yang menulis pesan follow-up singkat ke calon pembeli yang belum membalas.",
  "ATURAN WAJIB: jangan mengarang stok, harga, atau diskon baru yang tidak ada di percakapan sebelumnya.",
  "Jangan terkesan menagih atau memaksa. Isi cukup 1-2 kalimat: singgung singkat konteks obrolan sebelumnya, tanya apakah masih berminat atau ada yang bisa dibantu.",
  "Balas dalam Bahasa Indonesia."
].join("\n");

export async function generateWaAiFollowUpMessage(input: {
  messages: Array<{ direction: string; body: string }>;
  customerName?: string | null;
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) return null;

  const persona = await getWaAiPersonaPrompt();
  const transcript = input.messages
    .slice(-10)
    .map((message) => `${message.direction === "INBOUND" ? "Customer" : "Admin/AI"}: ${message.body}`)
    .join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: `${hardFollowUpRules}\n\nGAYA BICARA (boleh diatur admin toko):\n${persona}` },
          { role: "user", content: `Nama customer: ${input.customerName || "-"}\n\nPERCAKAPAN SEBELUMNYA:\n${transcript || "(tidak ada histori)"}` }
        ],
        temperature: 0.5
      }),
      signal: controller.signal
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" && content.trim() ? content.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
