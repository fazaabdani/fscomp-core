"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { demoUsers } from "@/lib/auth";
import { getSessionCookieName } from "@/lib/session";
import { getLoginUser } from "@/lib/user-store";
import { formValues, requiredText, z } from "@/lib/form-validation";

export async function loginAction(formData: FormData) {
  if (!z.object({ username: requiredText(80), password: requiredText(200) }).safeParse(formValues(formData)).success) {
    redirect("/login?error=login");
  }
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  let user = null;

  try {
    user = await getLoginUser(username, password);
  } catch {
    user = demoUsers.find((item) => item.username === username && item.password === password) ?? null;
  }

  if (!user) {
    redirect("/login?error=login");
  }

  cookies().set(getSessionCookieName(), JSON.stringify({
    name: user.name,
    username: user.username,
    password: "",
    role: user.role
  }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12
  });

  redirect("/");
}

export async function logoutAction() {
  cookies().delete(getSessionCookieName());
  redirect("/login");
}
