import { prisma } from "./prisma";

export type WaChannelId = "STORE" | "PERSONAL";

export const waChannelIds: WaChannelId[] = ["STORE", "PERSONAL"];

export const waChannelLabels: Record<WaChannelId, string> = {
  STORE: "WA Toko",
  PERSONAL: "WA Pribadi Faza"
};

const defaultActiveWaChannels: WaChannelId[] = ["PERSONAL"];

export function getWaChannelNumber(channel: WaChannelId): string | undefined {
  if (channel === "STORE") return process.env.WA_CHANNEL_STORE_NUMBER || undefined;
  return process.env.WA_CHANNEL_PERSONAL_NUMBER || undefined;
}

function isWaChannelId(value: unknown): value is WaChannelId {
  return typeof value === "string" && (waChannelIds as string[]).includes(value);
}

export async function getActiveWaChannels(): Promise<WaChannelId[]> {
  const setting = await prisma.waAiSetting.findUnique({ where: { key: "active_wa_channels" } });
  if (!setting || !Array.isArray(setting.value)) return defaultActiveWaChannels;

  const active = setting.value.filter(isWaChannelId);
  return active.length > 0 ? active : defaultActiveWaChannels;
}

/**
 * Payload dari n8n boleh tidak menyertakan `channel` sama sekali (backward compat
 * dengan test/dokumentasi lama) — dalam kasus itu gate ini dianggap lolos, tidak diblokir.
 */
export async function isWaChannelActive(channel: string | null | undefined): Promise<boolean> {
  if (!channel) return true;
  if (!isWaChannelId(channel)) return true;

  const active = await getActiveWaChannels();
  return active.includes(channel);
}
