export const chargerTypes = [
  "Lenovo kotak",
  "Lenovo type C",
  "Dell bulat besar",
  "Dell type C",
  "Dell bulat kecil",
  "HP bulat besar",
  "HP type C",
  "HP blue pin",
  "Acer",
  "Asus"
] as const;

export type ChargerType = (typeof chargerTypes)[number];

export function chargerFieldName(chargerType: string) {
  return `charger_${chargerType.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}
