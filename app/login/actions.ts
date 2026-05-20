"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { demoUsers } from "@/lib/auth";
import { getSessionCookieName } from "@/lib/session";

export async function loginAction(formData: FormData) {
  const userName = String(formData.get("userName") ?? "");
  const user = demoUsers.find((item) => item.name === userName);

  if (!user) {
    redirect("/login?error=user");
  }

  cookies().set(getSessionCookieName(), user.name, {
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
