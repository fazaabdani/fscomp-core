import type { RoleName } from "./constants";

export type User = {
  name: string;
  username: string;
  role: RoleName;
};

export function canViewPrice(user: User) {
  return user.role === "admin";
}

export function canEditBatch(user: User) {
  return user.role === "admin" || user.role === "teknisi";
}

export function canEditDailyQc(user: User) {
  return user.role === "admin" || user.role === "teknisi" || user.role === "magang";
}

export function canChangeDailyQcStockLocation(user: User) {
  return user.role === "admin" || user.role === "teknisi" || user.role === "sales" || user.role === "magang";
}

export function canEditInitialQc(user: User) {
  return user.role === "admin" || user.role === "teknisi";
}

export function canEditUnit(user: User) {
  return user.role === "admin";
}
