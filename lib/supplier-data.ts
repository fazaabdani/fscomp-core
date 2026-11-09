import { prisma } from "./prisma";

export function normalizeSupplierName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export type SupplierRow = {
  id: string | null;
  name: string;
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  notes: string;
  batchCount: number;
  returnCount: number;
};

/** Gabungan data induk supplier + nama supplier yang baru dikenal dari batch (belum ada alamat). */
export async function listSuppliers(): Promise<SupplierRow[]> {
  const [masters, batches] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.batchPSI.findMany({
      select: { supplier: true, units: { where: { statusObservasi: "RETUR_DISTRIBUTOR", soldAt: null }, select: { id: true } } }
    })
  ]);

  const stats = new Map<string, { name: string; batchCount: number; returnCount: number }>();
  for (const batch of batches) {
    const key = normalizeSupplierName(batch.supplier);
    if (!key) continue;
    const current = stats.get(key) ?? { name: batch.supplier.trim(), batchCount: 0, returnCount: 0 };
    current.batchCount += 1;
    current.returnCount += batch.units.length;
    stats.set(key, current);
  }

  const rows: SupplierRow[] = masters.map((supplier) => {
    const key = normalizeSupplierName(supplier.name);
    const stat = stats.get(key);
    stats.delete(key);
    return {
      id: supplier.id,
      name: supplier.name,
      recipientName: supplier.recipientName ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address,
      city: supplier.city ?? "",
      postalCode: supplier.postalCode ?? "",
      notes: supplier.notes ?? "",
      batchCount: stat?.batchCount ?? 0,
      returnCount: stat?.returnCount ?? 0
    };
  });

  for (const stat of Array.from(stats.values()).sort((a, b) => a.name.localeCompare(b.name))) {
    rows.push({
      id: null,
      name: stat.name,
      recipientName: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      notes: "",
      batchCount: stat.batchCount,
      returnCount: stat.returnCount
    });
  }
  return rows;
}

export async function findSupplierByName(name: string) {
  const key = normalizeSupplierName(name);
  if (!key) return null;
  const all = await prisma.supplier.findMany();
  return all.find((supplier) => normalizeSupplierName(supplier.name) === key) ?? null;
}

export async function supplierNameOptions() {
  const [masters, batches] = await Promise.all([
    prisma.supplier.findMany({ select: { name: true } }),
    prisma.batchPSI.findMany({ select: { supplier: true }, distinct: ["supplier"] })
  ]);
  const seen = new Map<string, string>();
  for (const name of [...masters.map((item) => item.name), ...batches.map((item) => item.supplier)]) {
    const key = normalizeSupplierName(name);
    if (key && !seen.has(key)) seen.set(key, name.trim());
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}
