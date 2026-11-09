"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { entityId, formValues, optionalText, requiredText, z } from "@/lib/form-validation";
import { normalizeSupplierName } from "@/lib/supplier-data";

const supplierSchema = z.object({
  name: requiredText(160),
  recipientName: optionalText(160),
  phone: optionalText(40),
  address: requiredText(500),
  city: optionalText(120),
  postalCode: optionalText(10),
  notes: optionalText(500)
});

function parse(formData: FormData) {
  const parsed = supplierSchema.safeParse(formValues(formData));
  if (!parsed.success) return null;
  const v = parsed.data;
  return {
    name: v.name.replace(/\s+/g, " "),
    recipientName: v.recipientName || null,
    phone: v.phone || null,
    address: v.address,
    city: v.city || null,
    postalCode: v.postalCode || null,
    notes: v.notes || null
  };
}

async function nameTaken(name: string, exceptId?: string) {
  const key = normalizeSupplierName(name);
  const all = await prisma.supplier.findMany({ select: { id: true, name: true } });
  return all.some((item) => item.id !== exceptId && normalizeSupplierName(item.name) === key);
}

export async function createSupplierAction(formData: FormData) {
  await requireRole(["admin", "teknisi"]);
  const data = parse(formData);
  if (!data) redirect("/supplier/new?error=invalid-input");
  if (await nameTaken(data.name)) redirect("/supplier/new?error=duplicate");
  await prisma.supplier.create({ data });
  revalidatePath("/supplier");
  redirect("/supplier?saved=1");
}

export async function updateSupplierAction(id: string, formData: FormData) {
  await requireRole(["admin", "teknisi"]);
  if (!entityId.safeParse(id).success) redirect("/supplier?error=invalid-input");
  const data = parse(formData);
  if (!data) redirect(`/supplier/${id}/edit?error=invalid-input`);
  if (await nameTaken(data.name, id)) redirect(`/supplier/${id}/edit?error=duplicate`);
  const exists = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
  if (!exists) redirect("/supplier?error=not-found");
  await prisma.supplier.update({ where: { id }, data });
  revalidatePath("/supplier");
  redirect("/supplier?saved=1");
}

export async function deleteSupplierAction(id: string) {
  await requireRole(["admin"]);
  if (!entityId.safeParse(id).success) redirect("/supplier?error=invalid-input");
  await prisma.supplier.deleteMany({ where: { id } });
  revalidatePath("/supplier");
  redirect("/supplier?deleted=1");
}
