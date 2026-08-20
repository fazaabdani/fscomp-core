import { timingSafeEqual } from "node:crypto";
import { getCurrentUser } from "./session";

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function hasIntegrationAccess(request: Request, secretName: "CORE_INTEGRATION_TOKEN" | "N8N_WEBHOOK_SECRET" | "BACKUP_EXPORT_TOKEN") {
  const configuredToken = process.env[secretName];
  if (!configuredToken || configuredToken.length < 24) return false;
  const authorization = request.headers.get("authorization");
  const requestToken = request.headers.get("x-api-key") ?? request.headers.get("x-backup-token") ?? (authorization?.startsWith("Bearer ") ? authorization.slice(7) : "");
  return Boolean(requestToken && secureEqual(requestToken, configuredToken));
}

export async function hasStaffAccess(roles: Array<"admin" | "teknisi" | "sales" | "magang">) {
  const user = await getCurrentUser();
  return Boolean(user && roles.includes(user.role));
}

/**
 * Fonnte tidak mendukung header custom di webhook masuk, jadi verifikasinya lewat
 * query param secret yang kita sendiri tempel di URL webhook yang didaftarkan ke Fonnte.
 */
export function hasFonnteWebhookAccess(request: Request) {
  const configuredSecret = process.env.FONNTE_WEBHOOK_SECRET;
  if (!configuredSecret || configuredSecret.length < 24) return false;
  const providedSecret = new URL(request.url).searchParams.get("key") ?? "";
  return Boolean(providedSecret && secureEqual(providedSecret, configuredSecret));
}

export function forbidden() {
  return new Response("Forbidden", { status: 403 });
}
