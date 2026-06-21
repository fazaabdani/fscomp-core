import { Role } from "@prisma/client";
import type { User } from "./auth";
import { hashPassword, isPasswordHash, verifyPassword } from "./password";
import { prisma } from "./prisma";

export function roleToDb(role: User["role"]): Role {
  if (role === "admin") return "ADMIN";
  if (role === "teknisi") return "TEKNISI";
  if (role === "sales") return "SALES";
  return "MAGANG";
}

export function roleFromDb(role: Role): User["role"] {
  if (role === "ADMIN") return "admin";
  if (role === "TEKNISI") return "teknisi";
  if (role === "SALES") return "sales";
  return "magang";
}

export async function getLoginUser(username: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { username, active: true }
  });
  if (!user || !user.username || !user.password) return null;
  if (!(await verifyPassword(password, user.password))) return null;

  if (!isPasswordHash(user.password)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(password) }
    });
  }

  return {
    name: user.name,
    username: user.username,
    role: roleFromDb(user.role)
  } satisfies User;
}

export async function getOrCreateDbUserForSession(user: User) {
  const dbUser = await prisma.user.findUnique({ where: { username: user.username } });
  if (!dbUser || !dbUser.active) throw new Error("User sesi tidak ditemukan atau nonaktif.");
  return dbUser;
}
