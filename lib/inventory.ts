import type { InventoryItemStatus, WarrantyDurationUnit } from "@prisma/client";

export function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatDateWib(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta"
  }).format(date);
}

export function jakartaDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function addWarrantyDuration(date: Date, amount: number, unit: WarrantyDurationUnit) {
  const warrantyUntil = new Date(date);
  const safeAmount = Math.max(0, amount);

  if (unit === "DAY") warrantyUntil.setDate(warrantyUntil.getDate() + safeAmount);
  if (unit === "WEEK") warrantyUntil.setDate(warrantyUntil.getDate() + safeAmount * 7);
  if (unit === "MONTH") warrantyUntil.setMonth(warrantyUntil.getMonth() + safeAmount);
  if (unit === "YEAR") warrantyUntil.setFullYear(warrantyUntil.getFullYear() + safeAmount);

  return warrantyUntil;
}

export function warrantyUnitLabel(unit: WarrantyDurationUnit) {
  if (unit === "DAY") return "hari";
  if (unit === "WEEK") return "minggu";
  if (unit === "YEAR") return "tahun";
  return "bulan";
}

export function inventoryStatusLabel(status: InventoryItemStatus) {
  if (status === "USED_IN_UNIT") return "Terpakai di unit";
  if (status === "SOLD") return "Terjual";
  if (status === "RETURNED") return "Retur distributor";
  if (status === "DAMAGED") return "Rusak/problem";
  if (status === "LOST") return "Hilang";
  return "Stok";
}

export function inventoryStatusTone(status: InventoryItemStatus) {
  if (status === "STOCK") return "green";
  if (status === "USED_IN_UNIT") return "yellow";
  if (status === "SOLD") return "yellow";
  if (status === "RETURNED") return "yellow";
  return "red";
}

export function warrantyInfo(input: {
  purchaseDate: Date;
  warrantyDuration: number;
  warrantyDurationUnit: WarrantyDurationUnit;
}) {
  if (input.warrantyDuration <= 0) {
    return {
      label: "Tanpa garansi",
      tone: "yellow",
      until: null as Date | null,
      daysLeft: null as number | null
    };
  }

  const until = addWarrantyDuration(input.purchaseDate, input.warrantyDuration, input.warrantyDurationUnit);
  const today = new Date(`${jakartaDateKey(new Date())}T00:00:00+07:00`);
  const compareUntil = new Date(`${jakartaDateKey(until)}T00:00:00+07:00`);
  const daysLeft = Math.ceil((compareUntil.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (daysLeft < 0) {
    return { label: "Garansi habis", tone: "red", until, daysLeft };
  }

  if (daysLeft <= 14) {
    return { label: "Garansi mau habis", tone: "yellow", until, daysLeft };
  }

  return { label: "Garansi aktif", tone: "green", until, daysLeft };
}
