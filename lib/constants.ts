export const roles = {
  admin: ["Admin"],
  teknisi: ["Teknisi"],
  sales: ["Sales"],
  magang: ["Anak Magang"]
} as const;

export type RoleName = keyof typeof roles;
