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

export async function ensureDefaultLoginUsers() {
  await Promise.all(
    demoUsers.map((user) =>
      prisma.user.upsert({
        where: { username: user.username },
        update: {
          name: user.name,
          password: user.password,
          role: roleToDb(user.role),
          active: true
        },
        create: {
          name: user.name,
          username: user.username,
          password: user.password,
          email: `${user.username}@fscomp.local`,
          role: roleToDb(user.role),
          active: true
        }
      })
    )
  );
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
  return prisma.user.upsert({
    where: { username: user.username },
    update: {
      name: user.name,
      role: roleToDb(user.role),
      active: true
    },
    create: {
      name: user.name,
      username: user.username,
      password: user.password,
      email: `${user.username}@fscomp.local`,
      role: roleToDb(user.role),
      active: true
    }
  });
}
