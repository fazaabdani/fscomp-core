import { roles, type RoleName } from "./constants";

export type User = {
  name: string;
  username: string;
  password: string;
  role: RoleName;
};

export const demoUsers: User[] = [
  { name: "Faza", username: "faza", password: "admin123", role: "admin" },
  { name: "Zume", username: "zume", password: "admin123", role: "admin" },
  { name: "Ludfy", username: "ludfy", password: "admin123", role: "admin" },
  { name: "Rosyadi", username: "rosyadi", password: "admin123", role: "teknisi" },
  { name: "Sales", username: "sales", password: "admin123", role: "sales" }
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

export function canEditUnit(user: User) {
  return user.role === "admin";
}
