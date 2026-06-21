"use server";

import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formValues, optionalText, requiredText, z } from "@/lib/form-validation";

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
  const validation = z.object({
    name: requiredText(160),
    username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/),
    password: z.string().min(8).max(200),
    email: optionalText(200),
    role: z.enum(["magang", "teknisi", "sales"])
  }).safeParse(formValues(formData));
  if (!validation.success) redirect("/register?error=invalid-input");
  const name = text(formData, "name");
  const username = text(formData, "username").toLowerCase();
  const password = text(formData, "password");
  const email = text(formData, "email") || `${username}@fscomp.local`;

  if (!name || !username || !password) {
    redirect("/register?error=required");
  }

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
      password,
      email,
      role: roleFromForm(formData),
      active: false
    }
  });

  redirect("/register?success=waiting");
}
