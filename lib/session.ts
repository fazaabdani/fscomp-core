import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { User } from "./auth";
import { prisma } from "./prisma";
import { encodeBase64Url, parseSessionPayload, SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "./session-token";
import { roleFromDb } from "./user-store";

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(user: User) {
  const secret = sessionSecret();
  if (!secret) throw new Error("SESSION_SECRET minimal 32 karakter belum dikonfigurasi.");
  const payload = encodeBase64Url(JSON.stringify({
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS
  }));
  return `${payload}.${signature(payload, secret)}`;
}

/**
 * Cookie sendiri cuma memverifikasi signature+expiry (jadi middleware yang berjalan di Edge
 * runtime bisa cek cepat tanpa akses DB). Fungsi ini menambah satu lapis lagi: verifikasi ulang
 * ke database supaya user yang baru dinonaktifkan / diganti role admin langsung kehilangan akses
 * di request berikutnya, bukan menunggu cookie 12 jam itu kedaluwarsa sendiri.
 */
export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const secret = sessionSecret();
  if (!token || !secret) return null;
  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra) return null;
  const expected = signature(payload, secret);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) return null;
  const parsed = parseSessionPayload(payload);
  if (!parsed) return null;

  const dbUser = await prisma.user.findUnique({
    where: { username: parsed.username },
    select: { active: true, role: true }
  });
  if (!dbUser || !dbUser.active || roleFromDb(dbUser.role) !== parsed.role) return null;

  return { name: parsed.name, username: parsed.username, role: parsed.role };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(allowedRoles: User["role"][]) {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) redirect("/");
  return user;
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}
