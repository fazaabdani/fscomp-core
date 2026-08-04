import type { WaChannelId } from "./wa-ai-channels";

export type FonnteInboundPayload = {
  sender?: unknown;
  message?: unknown;
  text?: unknown;
  name?: unknown;
  device?: unknown;
};

export type NormalizedFonnteMessage = {
  phone: string;
  message: string;
  customerName: string | null;
  device: string | null;
};

/**
 * Field resmi dari dokumentasi Fonnte (docs.fonnte.com/webhook-reply-message):
 * sender, message, name, device, timestamp. Bukan "device_id" — sudah dicek langsung
 * ke dokumentasi, bukan ditebak.
 */
export function parseFonnteInboundWebhook(body: unknown): NormalizedFonnteMessage | null {
  if (!body || typeof body !== "object") return null;
  const payload = body as FonnteInboundPayload;

  const phone = typeof payload.sender === "string" ? payload.sender.trim() : "";
  const message =
    typeof payload.message === "string" && payload.message.trim()
      ? payload.message
      : typeof payload.text === "string"
        ? payload.text
        : "";

  if (!phone || !message.trim()) return null;

  return {
    phone,
    message,
    customerName: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : null,
    device: typeof payload.device === "string" && payload.device.trim() ? payload.device.trim() : null
  };
}

/**
 * "device" dari Fonnte belum pernah kita lihat nilai aslinya (belum ada webhook asli masuk).
 * Kalau env WA_CHANNEL_*_DEVICE belum diisi atau tidak cocok, dianggap tidak dikenali —
 * bukan diblokir (lihat isWaChannelActive: channel tidak dikenal = lolos, bukan ditolak).
 * Faza tinggal isi env ini setelah lihat nilai "device" yang asli dari webhook pertama.
 */
export function resolveWaChannelFromDevice(device: string | null): WaChannelId | null {
  if (!device) return null;
  if (device === process.env.WA_CHANNEL_STORE_DEVICE) return "STORE";
  if (device === process.env.WA_CHANNEL_PERSONAL_DEVICE) return "PERSONAL";
  return null;
}

export async function sendFonnteMessage(input: { target: string; message: string }): Promise<boolean> {
  const token = process.env.FONNTE_TOKEN;
  if (!token || !input.message) return false;

  const body = new URLSearchParams({ target: input.target, message: input.message });

  try {
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token },
      body
    });
    if (!response.ok) return false;
    const data = (await response.json().catch(() => null)) as { status?: boolean } | null;
    return data?.status !== false;
  } catch {
    return false;
  }
}
