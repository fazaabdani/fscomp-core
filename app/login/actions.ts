"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, getSessionCookieName } from "@/lib/session";
import { SESSION_DURATION_SECONDS } from "@/lib/session-token";
import { getLoginUser } from "@/lib/user-store";
import { formValues, requiredText, z } from "@/lib/form-validation";
import type { User } from "@/lib/auth";
import { clearFailedLogins, isLoginRateLimited, recordFailedLogin } from "@/lib/login-rate-limit";
import { clientIp } from "@/lib/request-ip";

export async function loginAction(formData: FormData) {
  if (!z.object({ username: requiredText(80), password: requiredText(200) }).safeParse(formValues(formData)).success) {
    redirect("/login?error=login");
  }
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rateLimitKey = `${clientIp()}:${username}`;
  if (isLoginRateLimited(rateLimitKey)) redirect("/login?error=rate-limit");
  let user: User | null = null;

  try {
    user = await getLoginUser(username, password);
  } catch {
    redirect("/login?error=server");
  }
  if (!user) {
    recordFailedLogin(rateLimitKey);
    redirect("/login?error=login");
  }
  clearFailedLogins(rateLimitKey);

  let sessionToken = "";
  try {
    sessionToken = createSessionToken(user);
  } catch {
    redirect("/login?error=server");
  }

  cookies().set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS
  });

  redirect("/");
}

export async function logoutAction() {
  cookies().delete(getSessionCookieName());
  redirect("/login");
}
