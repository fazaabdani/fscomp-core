"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { demoUsers } from "@/lib/auth";
import { getSessionCookieName } from "@/lib/session";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = demoUsers.find((item) => item.username === username && item.password === password);

  if (!user) {
    redirect("/login?error=login");
  }

  cookies().set(getSessionCookieName(), user.username, {
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
