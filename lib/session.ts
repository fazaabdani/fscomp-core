import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { demoUsers, type User } from "./auth";

const sessionCookieName = "fscomp_user";

export function getCurrentUser(): User | null {
  const rawSession = cookies().get(sessionCookieName)?.value;
  if (!rawSession) return null;

  try {
    const parsed = JSON.parse(rawSession) as User;
    if (parsed?.username && parsed?.role && parsed?.name) {
      return parsed;
    }
  } catch {
    return demoUsers.find((user) => user.username === rawSession) ?? null;
  }

  return demoUsers.find((user) => user.username === rawSession) ?? null;
}

export function requireUser() {
  const user = getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function requireRole(allowedRoles: User["role"][]) {
  const user = requireUser();
  if (!allowedRoles.includes(user.role)) redirect("/");
  return user;
}

export function getSessionCookieName() {
  return sessionCookieName;
}
