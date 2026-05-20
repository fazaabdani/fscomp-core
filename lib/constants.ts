export const roles = {
  admin: ["Faza", "Zume"],
  teknisi: ["Ludfy", "Rosyadi"],
  magang: ["Anak Magang"]
} as const;

export type RoleName = keyof typeof roles;

export const unitStatuses = [
  "VERIFIED",
  "VERIFIED WITH NOTES",
  "RECHECK",
  "CANDIDATE RETUR"
] as const;

export type UnitStatus = (typeof unitStatuses)[number];

export const dailyStatuses = [
  "Lolos",
  "Lolos dengan catatan",
  "Tidak Lolos"
] as const;

export type DailyStatus = (typeof dailyStatuses)[number];

export const qcResultOptions = ["OK", "NOTES", "FAIL"] as const;

export type QcResult = (typeof qcResultOptions)[number];

export const statusTone: Record<UnitStatus, "green" | "yellow" | "red"> = {
  VERIFIED: "green",
  "VERIFIED WITH NOTES": "yellow",
  RECHECK: "yellow",
  "CANDIDATE RETUR": "red"
};

export const catalogReadyStatuses: UnitStatus[] = ["VERIFIED", "VERIFIED WITH NOTES"];
