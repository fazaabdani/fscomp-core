import { prisma } from "./prisma";
import type { User } from "./auth";

function roleToDb(role: User["role"]) {
  if (role === "admin") return "ADMIN";
  if (role === "teknisi") return "TEKNISI";
  if (role === "sales") return "SALES";
  return "MAGANG";
}

export function roleFromDb(role: string): User["role"] {
  if (role === "ADMIN") return "admin";
  if (role === "TEKNISI") return "teknisi";
  if (role === "SALES") return "sales";
  return "magang";
}

export async function getOrCreateDbUserForSession(user: User) {
  const email = `${user.username}@fscomp.local`;
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { username: user.username },
        { email }
      ]
    }
  });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      name: user.name,
      email,
      username: user.username,
      password: user.password,
      role: roleToDb(user) as any,
      active: true
    }
  });
}
