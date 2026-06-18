import type { LicenseDurationType, LicenseStatus, LicenseType } from "@prisma/client";
import { formatDateWib } from "./inventory";

export function licenseTypeLabel(type: LicenseType) {
  if (type === "OFFICE") return "Microsoft Office";
  if (type === "WINDOWS") return "Windows";
  if (type === "ANTIVIRUS") return "Antivirus";
  return "Lisensi Lainnya";
}

export function licenseStatusLabel(status: LicenseStatus) {
  if (status === "AVAILABLE") return "Tersedia";
  if (status === "SENT") return "Terkirim";
  if (status === "PROBLEM") return "Bermasalah";
  if (status === "REPLACED") return "Diganti";
  return "Terpakai";
}

export function licenseStatusTone(status: LicenseStatus) {
  if (status === "AVAILABLE") return "green";
  if (status === "ASSIGNED") return "yellow";
  if (status === "SENT") return "green";
  return "red";
}

export function licenseDurationLabel(durationType: LicenseDurationType, validUntil?: Date | null) {
  if (durationType === "LIFETIME") return "Lifetime";
  if (validUntil) return `Berlaku sampai ${formatDateWib(validUntil)}`;
  if (durationType === "YEARLY") return "Tahunan";
  return "Custom";
}

export function inferLicenseType(name: string, category: string): LicenseType | null {
  const text = `${name} ${category}`.toLowerCase();
  if (text.includes("office")) return "OFFICE";
  if (text.includes("windows") || text.includes("win 10") || text.includes("win 11")) return "WINDOWS";
  if (text.includes("antivirus")) return "ANTIVIRUS";
  if (text.includes("lisensi") || text.includes("license") || text.includes("software")) return "OTHER";
  return null;
}

export function inferLicenseVersion(name: string, type: LicenseType) {
  const text = name.toLowerCase();
  const officeVersion = text.match(/\b(2016|2019|2021|2024)\b/);
  if (type === "OFFICE") return officeVersion?.[1] ?? "2021";

  const windowsVersion = text.match(/\b(10|11)\b/);
  if (type === "WINDOWS") {
    const base = windowsVersion?.[1] ?? "11";
    if (text.includes("home")) return `${base} Home Single Language`;
    if (text.includes("pro")) return `${base} Pro`;
    return `${base} Pro`;
  }

  return "Lifetime";
}

export function licenseDisplayName(type: LicenseType, version: string, edition?: string | null) {
  const typeName = licenseTypeLabel(type);
  return [typeName, version, edition].filter(Boolean).join(" ");
}

export function maskProductKey(key?: string | null) {
  if (!key) return "-";
  const clean = key.trim();
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 5)}•••••${clean.slice(-5)}`;
}
