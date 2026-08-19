import { headers } from "next/headers";

export function clientIp() {
  const headerList = headers();
  const cfConnectingIp = headerList.get("cf-connecting-ip")?.trim();
  if (cfConnectingIp) return cfConnectingIp;

  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    const parts = forwardedFor.split(",").map((part) => part.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
}
