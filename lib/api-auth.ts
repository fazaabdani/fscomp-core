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

export function hasStaffAccess(roles: Array<"admin" | "teknisi" | "sales" | "magang">) {
  const user = getCurrentUser();
  return Boolean(user && roles.includes(user.role));
}

export function forbidden() {
  return new Response("Forbidden", { status: 403 });
}
