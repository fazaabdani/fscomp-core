"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { ensureDefaultLoginUsers, roleToDb } from "@/lib/user-store";
import type { User } from "@/lib/auth";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function roleFromForm(formData: FormData): User["role"] {
  const role = text(formData, "role");
  if (role === "teknisi") return "teknisi";
  if (role === "sales") return "sales";
  if (role === "magang") return "magang";
  return "admin";
}

async function isLastActiveAdmin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, active: true } });
  if (!user || user.role !== "ADMIN" || !user.active) return false;
  const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
  return activeAdmins <= 1;
}

export async function createUserAction(formData: FormData) {
  requireRole(["admin"]);
  await ensureDefaultLoginUsers();

  const name = text(formData, "name");
  const username = text(formData, "username").toLowerCase();
  const password = text(formData, "password");
  const role = roleFromForm(formData);
  const email = text(formData, "email") || `${username}@fscomp.local`;

  if (!name || !username || !password) {
    redirect("/users?error=required");
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }]
    },
    select: { id: true }
  });

  if (existing) {
    redirect("/users?error=duplicate");
  }

  await prisma.user.create({
    data: {
      name,
      username,
      password,
      email,
      role: roleToDb(role),
      active: true
    }
  });

  revalidatePath("/users");
  redirect("/users?success=created");
}

export async function updateUserAction(userId: string, formData: FormData) {
  requireRole(["admin"]);
  await ensureDefaultLoginUsers();

  const name = text(formData, "name");
  const username = text(formData, "username").toLowerCase();
  const password = text(formData, "password");
  const role = roleFromForm(formData);
  const email = text(formData, "email") || `${username}@fscomp.local`;
  const active = text(formData, "active") === "on";

  if (!name || !username) {
    redirect(`/users/${userId}/edit?error=required`);
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true }
  });

  if (!existingUser) {
    redirect("/users?error=required");
  }

  if (!active && (await isLastActiveAdmin(userId))) {
    redirect(`/users/${userId}/edit?error=last-admin`);
  }

  const duplicate = await prisma.user.findFirst({
    where: {
      NOT: { id: userId },
      OR: [{ username }, { email }]
    },
    select: { id: true }
  });

  if (duplicate) {
    redirect(`/users/${userId}/edit?error=duplicate`);
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      username,
      email,
      role: roleToDb(role),
      active,
      password: password || existingUser.password || ""
    }
  });

  revalidatePath("/users");
  redirect("/users?success=updated");
}

export async function deactivateUserAction(userId: string) {
  requireRole(["admin"]);
  await ensureDefaultLoginUsers();

  if (await isLastActiveAdmin(userId)) {
    redirect("/users?error=last-admin");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { active: false }
  });

  revalidatePath("/users");
  redirect("/users?success=disabled");
}

export async function activateUserAction(userId: string) {
  requireRole(["admin"]);
  await ensureDefaultLoginUsers();

  await prisma.user.update({
    where: { id: userId },
    data: { active: true }
  });

  revalidatePath("/users");
  redirect("/users?success=activated");
}
