"use server";

import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function roleFromForm(formData: FormData): Role {
  const role = text(formData, "role");
  if (role === "teknisi") return "TEKNISI";
  if (role === "sales") return "SALES";
  return "MAGANG";
}

export async function registerUserAction(formData: FormData) {
  const name = text(formData, "name");
  const username = text(formData, "username").toLowerCase();
  const password = text(formData, "password");
  const email = text(formData, "email") || `${username}@fscomp.local`;

  if (!name || !username || !password) {
    redirect("/register?error=required");
  }
  if (password.length < 8) redirect("/register?error=password-short");

  const duplicate = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }]
    },
    select: { id: true }
  });

  if (duplicate) {
    redirect("/register?error=duplicate");
  }

  await prisma.user.create({
    data: {
      name,
      username,
      password: await hashPassword(password),
      email,
      role: roleFromForm(formData),
      active: false
    }
  });

  redirect("/register?success=waiting");
}
