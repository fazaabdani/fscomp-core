export const roles = {
  owner: ["Faza", "Zume"],
  qcAwal: ["Ludfy", "Rosyadi"],
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

export const statusTone: Record<UnitStatus, "green" | "yellow" | "red"> = {
  VERIFIED: "green",
  "VERIFIED WITH NOTES": "yellow",
  RECHECK: "yellow",
  "CANDIDATE RETUR": "red"
};

export const catalogReadyStatuses: UnitStatus[] = ["VERIFIED", "VERIFIED WITH NOTES"];
