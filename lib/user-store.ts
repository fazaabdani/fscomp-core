import { Role } from "@prisma/client";
import { demoUsers, type User } from "./auth";
import { prisma } from "./prisma";

export function roleToDb(role: User["role"]): Role {
  if (role === "admin") return "ADMIN";
  if (role === "teknisi") return "TEKNISI";
  return "MAGANG";
}

export function roleFromDb(role: Role): User["role"] {
  if (role === "ADMIN") return "admin";
  if (role === "TEKNISI") return "teknisi";
  return "magang";
}

async function syncLoginUser(user: User) {
  const email = `${user.username}@fscomp.local`;
  const existingByUsername = await prisma.user.findUnique({ where: { username: user.username } });
  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  const existing = existingByUsername ?? existingByEmail;

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: user.name,
        username: user.username,
        password: user.password,
        role: roleToDb(user.role),
        active: true
      }
    });
  }

  return prisma.user.create({
    data: {
      name: user.name,
      username: user.username,
      password: user.password,
      email,
      role: roleToDb(user.role),
      active: true
    }
  });
}

export async function ensureDefaultLoginUsers() {
  for (const user of demoUsers) {
    await syncLoginUser(user);
  }
}

export async function getLoginUser(username: string, password: string) {
  await ensureDefaultLoginUsers();
  const user = await prisma.user.findFirst({
    where: {
      username,
      password,
      active: true
    }
  });

  if (!user || !user.username || !user.password) return null;

  return {
    name: user.name,
    username: user.username,
    password: user.password,
    role: roleFromDb(user.role)
  } satisfies User;
}

export async function getOrCreateDbUserForSession(user: User) {
  await ensureDefaultLoginUsers();
  return syncLoginUser(user);
}
