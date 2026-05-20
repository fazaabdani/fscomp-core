import { roles, type RoleName } from "./constants";

export type User = {
  name: string;
  role: RoleName;
};

export const demoUsers: User[] = [
  { name: "Faza", role: "owner" },
  { name: "Zume", role: "owner" },
  { name: "Ludfy", role: "qcAwal" },
  { name: "Rosyadi", role: "qcAwal" },
  { name: "Anak Magang", role: "magang" }
];

export function canViewPrice(user: User) {
  return (roles.owner as readonly string[]).includes(user.name);
}

export function canEditBatch(user: User) {
  return user.role === "owner" || user.role === "qcAwal";
}

export function canEditDailyQc(user: User) {
  return user.role === "owner" || user.role === "magang";
}

export function canEditInitialQc(user: User) {
  return user.role === "owner" || user.role === "qcAwal";
}
