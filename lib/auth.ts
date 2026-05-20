import { roles, type RoleName } from "./constants";

export type User = {
  name: string;
  username: string;
  password: string;
  role: RoleName;
};

export const demoUsers: User[] = [
  { name: "Ludfy", username: "admin", password: "admin123", role: "admin" },
  { name: "Rosyadi", username: "teknisi", password: "admin123", role: "teknisi" },
  { name: "PKL", username: "pkl", password: "pkl", role: "magang" }
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
