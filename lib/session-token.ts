import type { User } from "./auth";

export type SessionPayload = User & {
  exp: number;
};

export const SESSION_DURATION_SECONDS = 60 * 60 * 12;
export const SESSION_COOKIE_NAME = "fscomp_user";

export function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function parseSessionPayload(encodedPayload: string): SessionPayload | null {
  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as Partial<SessionPayload>;
    const validRole = payload.role === "admin" || payload.role === "teknisi" || payload.role === "sales" || payload.role === "magang";
    if (!payload.name || !payload.username || !validRole || typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
