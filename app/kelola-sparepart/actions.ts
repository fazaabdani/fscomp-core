"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { entityId } from "@/lib/form-validation";
import { extractLedSpec, isSparepartCategory, parseBulk } from "@/lib/sparepart";

const ROLES = ["admin", "teknisi", "sales"] as const;

function text(formData: FormData, key: string, max = 300) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}
function intValue(formData: FormData, key: string, fallback = 0) {
  const raw = String(formData.get(key) ?? "").replace(/[^\d-]/g, "");
  const value = Number(raw);
  return Number.isFinite(value) && raw !== "" ? Math.max(-1_000_000, Math.min(1_000_000_000, Math.round(value))) : fallback;
}
function category(formData: FormData) {
  const value = text(formData, "category", 40);
  return isSparepartCategory(value) ? value : "LAINNYA";
}

function refresh(id?: string) {
  revalidatePath("/kelola-sparepart");
  revalidatePath("/sparepart");
  if (id) revalidatePath(`/kelola-sparepart/${id}`);
}

function fieldsFrom(formData: FormData) {
  const cat = category(formData);
  const name = text(formData, "name", 200);
  const spec = text(formData, "spec") || null;
  const led = cat === "LED" ? extractLedSpec(`${name} ${spec ?? ""}`) : null;
  return {
    category: cat,
    name,
    brand: text(formData, "brand", 100) || null,
    spec,
    sizeInch: text(formData, "sizeInch", 20) || led?.sizeInch || null,
    resolution: text(formData, "resolution", 30) || led?.resolution || null,
    pins: text(formData, "pins", 20) || led?.pins || null,
    thickness: text(formData, "thickness", 20) || led?.thickness || null,
    compat: text(formData, "compat", 500) || null,
    minQty: Math.max(0, intValue(formData, "minQty", 2)),
    costPrice: Math.max(0, intValue(formData, "costPrice")),
    salePrice: intValue(formData, "salePrice") > 0 ? intValue(formData, "salePrice") : null,
    location: text(formData, "location", 100) || null,
    shared: formData.get("shared") === "on",
    notes: text(formData, "notes", 1000) || null
  };
}

export async function createSparepartAction(formData: FormData) {
  const user = await requireRole([...ROLES]);
  const data = fieldsFrom(formData);
  if (!data.name) redirect("/kelola-sparepart?error=nama");
  const qty = Math.max(0, intValue(formData, "qty"));
  const item = await prisma.sparepartItem.create({
    data: {
      ...data,
      qty,
      moves: qty > 0 ? { create: { delta: qty, qtyAfter: qty, reason: "Stok awal", byName: user.name } } : undefined
    }
  });
  refresh(item.id);
  redirect(`/kelola-sparepart?k=${data.category}&ok=tambah`);
}

// Tombol +/- cepat di daftar. Stok tidak pernah turun di bawah 0; setiap perubahan tercatat di riwayat.
export async function adjustSparepartAction(id: string, delta: number, reason: string) {
  const user = await requireRole([...ROLES]);
  if (!entityId.safeParse(id).success || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 10_000) return;
  await prisma.$transaction(async (tx) => {
    const item = await tx.sparepartItem.findUnique({ where: { id }, select: { qty: true } });
    if (!item) return;
    const next = Math.max(0, item.qty + delta);
    if (next === item.qty) return;
    await tx.sparepartItem.update({ where: { id }, data: { qty: next } });
    await tx.sparepartMove.create({ data: { itemId: id, delta: next - item.qty, qtyAfter: next, reason, byName: user.name } });
  });
  refresh(id);
}

export async function updateSparepartAction(id: string, formData: FormData) {
  const user = await requireRole([...ROLES]);
  if (!entityId.safeParse(id).success) redirect("/kelola-sparepart");
  const data = fieldsFrom(formData);
  if (!data.name) redirect(`/kelola-sparepart/${id}?error=nama`);
  const target = intValue(formData, "qty", -1);
  await prisma.$transaction(async (tx) => {
    const current = await tx.sparepartItem.findUnique({ where: { id }, select: { qty: true } });
    if (!current) return;
    const next = target >= 0 ? target : current.qty;
    await tx.sparepartItem.update({ where: { id }, data: { ...data, qty: next } });
    if (next !== current.qty) {
      const reason = text(formData, "reason", 200) || "Koreksi stok";
      await tx.sparepartMove.create({ data: { itemId: id, delta: next - current.qty, qtyAfter: next, reason, byName: user.name } });
    }
  });
  refresh(id);
  redirect(`/kelola-sparepart?k=${data.category}&ok=simpan`);
}

export async function deleteSparepartAction(id: string) {
  await requireRole(["admin"]);
  if (!entityId.safeParse(id).success) redirect("/kelola-sparepart");
  await prisma.sparepartItem.deleteMany({ where: { id } });
  refresh();
  redirect("/kelola-sparepart?ok=hapus");
}

// Tempel banyak barang sekaligus (dari Excel atau WhatsApp). Barang yang sama (kategori + nama + spek) digabung, jumlahnya ditambah.
export async function bulkImportSparepartAction(formData: FormData) {
  const user = await requireRole([...ROLES]);
  const cat = category(formData);
  const { rows } = parseBulk(String(formData.get("bulk") ?? ""));
  if (rows.length === 0) redirect("/kelola-sparepart?error=kosong");

  let created = 0;
  let merged = 0;
  for (const row of rows) {
    const existing = await prisma.sparepartItem.findFirst({
      where: {
        category: cat,
        name: { equals: row.name, mode: "insensitive" },
        spec: row.spec ? { equals: row.spec, mode: "insensitive" } : null
      },
      select: { id: true, qty: true }
    });
    if (existing) {
      if (row.qty > 0) {
        const next = existing.qty + row.qty;
        await prisma.$transaction([
          prisma.sparepartItem.update({ where: { id: existing.id }, data: { qty: next } }),
          prisma.sparepartMove.create({ data: { itemId: existing.id, delta: row.qty, qtyAfter: next, reason: "Impor massal", byName: user.name } })
        ]);
      }
      merged += 1;
      continue;
    }
    const led = cat === "LED" ? extractLedSpec(`${row.name} ${row.spec ?? ""}`) : null;
    await prisma.sparepartItem.create({
      data: {
        category: cat,
        name: row.name,
        spec: row.spec,
        compat: row.compat,
        qty: row.qty,
        costPrice: row.costPrice,
        salePrice: row.salePrice,
        sizeInch: led?.sizeInch ?? null,
        resolution: led?.resolution ?? null,
        pins: led?.pins ?? null,
        thickness: led?.thickness ?? null,
        moves: row.qty > 0 ? { create: { delta: row.qty, qtyAfter: row.qty, reason: "Impor massal", byName: user.name } } : undefined
      }
    });
    created += 1;
  }
  refresh();
  redirect(`/kelola-sparepart?k=${cat}&ok=impor&baru=${created}&gabung=${merged}`);
}
