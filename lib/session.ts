import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { demoUsers, type User } from "./auth";

const sessionCookieName = "fscomp_user";

export function getCurrentUser(): User | null {
  const name = cookies().get(sessionCookieName)?.value;
  return demoUsers.find((user) => user.name === name) ?? null;
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
