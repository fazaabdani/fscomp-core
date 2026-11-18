"use server";

import type { InventoryItemStatus, ProductCondition, WarrantyDurationUnit } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { dateInput, entityId, formValues, nonNegativeInteger, requiredText, z } from "@/lib/form-validation";
import { isCatalogKind } from "@/lib/katalog-pc";

const inventoryFormSchema = z.object({
  name: requiredText(200),
  supplier: requiredText(200),
  purchaseDate: dateInput,
  warrantyDuration: nonNegativeInteger,
  costPrice: nonNegativeInteger
});

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberValue(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : 0;
}

function purchaseDateValue(formData: FormData) {
  const rawDate = text(formData, "purchaseDate");
  if (!rawDate) return null;
  const date = new Date(`${rawDate}T00:00:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function warrantyUnitValue(value: string): WarrantyDurationUnit {
  if (value === "DAY" || value === "WEEK" || value === "YEAR") return value;
  return "MONTH";
}

function statusValue(value: string): InventoryItemStatus {
  if (value === "USED_IN_UNIT" || value === "SOLD" || value === "RETURNED" || value === "DAMAGED" || value === "LOST") return value;
  return "STOCK";
}

// Bidang katalog PC (/katalog/pc). Semua opsional; barang hanya tampil bila dicentang "tampil" dan harga jual > 0.
function catalogFields(formData: FormData) {
  const kindRaw = text(formData, "catalogKind");
  const salePriceRaw = Math.max(0, Math.round(numberValue(formData, "salePrice")));
  return {
    salePrice: salePriceRaw > 0 ? salePriceRaw : null,
    condition: (text(formData, "condition") === "NEW" ? "NEW" : "SECOND") as ProductCondition,
    catalogKind: isCatalogKind(kindRaw) ? kindRaw : null,
    catalogPublic: formData.get("catalogPublic") === "on",
    catalogIncludes: text(formData, "catalogIncludes").slice(0, 300) || null,
    catalogImageUrl: text(formData, "catalogImageUrl").slice(0, 500) || null,
    catalogWarrantyNote: text(formData, "catalogWarrantyNote").slice(0, 200) || null,
    catalogSort: Math.max(0, Math.min(9999, Math.round(numberValue(formData, "catalogSort"))))
  };
}

export async function createInventoryItemAction(formData: FormData) {
  const user = await requireRole(["admin", "teknisi", "sales"]);
  if (!inventoryFormSchema.safeParse(formValues(formData)).success) redirect("/inventory?error=invalid-input");

  const category = text(formData, "category") || "LAINNYA";
  const name = text(formData, "name");
  const supplier = text(formData, "supplier");
  const purchaseDate = purchaseDateValue(formData);
  const warrantyDuration = Math.max(0, numberValue(formData, "warrantyDuration"));
  const warrantyDurationUnit = warrantyUnitValue(text(formData, "warrantyDurationUnit"));
  const status = statusValue(text(formData, "status"));
  const unitId = text(formData, "unitId");

  if (!name || !supplier || !purchaseDate) {
    redirect("/inventory?error=required");
  }

  const dbUser = await prisma.user.findFirst({
    where: { username: user.username },
    select: { id: true }
  });

  await prisma.inventoryItem.create({
    data: {
      category,
      name,
      brandModel: text(formData, "brandModel") || null,
      specification: text(formData, "specification") || null,
      serialNumber: text(formData, "serialNumber") || null,
      supplier,
      invoiceNumber: text(formData, "invoiceNumber") || null,
      invoiceImageUrl: text(formData, "invoiceImageUrl") || null,
      purchaseDate,
      warrantyDuration,
      warrantyDurationUnit,
      status,
      unitId: unitId || null,
      buyerName: text(formData, "buyerName") || null,
      buyerPhone: text(formData, "buyerPhone") || null,
      costPrice: Math.max(0, numberValue(formData, "costPrice")),
      notes: text(formData, "notes") || null,
      ...catalogFields(formData),
      createdById: dbUser?.id ?? null
    }
  });

  revalidatePath("/inventory");
  redirect("/inventory?success=created");
}

export async function updateInventoryItemAction(itemId: string, formData: FormData) {
  await requireRole(["admin", "sales"]);
  if (!entityId.safeParse(itemId).success || !inventoryFormSchema.safeParse(formValues(formData)).success) {
    redirect(`/inventory/${itemId}/edit?error=invalid-input`);
  }

  const category = text(formData, "category") || "LAINNYA";
  const name = text(formData, "name");
  const supplier = text(formData, "supplier");
  const purchaseDate = purchaseDateValue(formData);
  const warrantyDuration = Math.max(0, numberValue(formData, "warrantyDuration"));
  const warrantyDurationUnit = warrantyUnitValue(text(formData, "warrantyDurationUnit"));
  const status = statusValue(text(formData, "status"));
  const unitId = text(formData, "unitId");

  if (!name || !supplier || !purchaseDate) {
    redirect(`/inventory/${itemId}/edit?error=required`);
  }

  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      category,
      name,
      brandModel: text(formData, "brandModel") || null,
      specification: text(formData, "specification") || null,
      serialNumber: text(formData, "serialNumber") || null,
      supplier,
      invoiceNumber: text(formData, "invoiceNumber") || null,
      invoiceImageUrl: text(formData, "invoiceImageUrl") || null,
      purchaseDate,
      warrantyDuration,
      warrantyDurationUnit,
      status,
      unitId: unitId || null,
      buyerName: text(formData, "buyerName") || null,
      buyerPhone: text(formData, "buyerPhone") || null,
      costPrice: Math.max(0, numberValue(formData, "costPrice")),
      notes: text(formData, "notes") || null,
      ...catalogFields(formData)
    }
  });

  revalidatePath("/inventory");
  revalidatePath("/katalog/pc");
  revalidatePath(`/inventory/${itemId}/edit`);
  redirect("/inventory?success=updated");
}
