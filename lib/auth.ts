import { roles, type RoleName } from "./constants";

export type User = {
  name: string;
  role: RoleName;
};

export const demoUsers: User[] = [
  { name: "Faza", role: "admin" },
  { name: "Zume", role: "admin" },
  { name: "Ludfy", role: "teknisi" },
  { name: "Rosyadi", role: "teknisi" },
  { name: "Anak Magang", role: "magang" }
];

export function canViewPrice(user: User) {
  return user.role === "admin";
}

export function canEditBatch(user: User) {
  return user.role === "admin" || user.role === "teknisi";
}

export function canEditDailyQc(user: User) {
  return user.role === "admin" || user.role === "teknisi" || user.role === "magang";
}

export function canEditInitialQc(user: User) {
  return user.role === "admin" || user.role === "teknisi";
}
