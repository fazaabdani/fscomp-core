"use server";

import type { LicenseDurationType, LicenseStatus, LicenseType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { licenseDisplayName } from "@/lib/licenses";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { dateInput, formValues, nonNegativeInteger, requiredText, z } from "@/lib/form-validation";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberValue(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : 0;
}

function dateValue(rawDate: string) {
  if (!rawDate) return null;
  const date = new Date(`${rawDate}T00:00:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function licenseTypeValue(value: string): LicenseType {
  if (value === "WINDOWS" || value === "ANTIVIRUS" || value === "OTHER") return value;
  return "OFFICE";
}

function durationValue(value: string): LicenseDurationType {
  if (value === "YEARLY" || value === "CUSTOM") return value;
  return "LIFETIME";
}

function statusValue(value: string): LicenseStatus {
  if (value === "AVAILABLE" || value === "SENT" || value === "PROBLEM" || value === "REPLACED") return value;
  return "ASSIGNED";
}

export async function createLicenseRecordAction(formData: FormData) {
  const currentUser = requireRole(["admin", "sales"]);
  const validation = z.object({
    version: requiredText(100),
    purchaseDate: dateInput,
    salePrice: nonNegativeInteger,
    costPrice: nonNegativeInteger
  }).safeParse(formValues(formData));
  if (!validation.success) redirect("/licenses?error=invalid-input");
  const licenseType = licenseTypeValue(text(formData, "licenseType"));
  const version = text(formData, "version");
  const purchaseDate = dateValue(text(formData, "purchaseDate"));
  const durationType = durationValue(text(formData, "durationType"));
  const validUntil = dateValue(text(formData, "validUntil"));
  const unitId = text(formData, "unitId");

  if (!version || !purchaseDate) {
    redirect("/licenses?error=required");
  }

  const dbUser = await prisma.user.findFirst({
    where: { username: currentUser.username },
    select: { id: true }
  });

  await prisma.licenseRecord.create({
    data: {
      name: text(formData, "name") || licenseDisplayName(licenseType, version, text(formData, "edition")),
      licenseType,
      version,
      edition: text(formData, "edition") || null,
      productKey: text(formData, "productKey") || null,
      durationType,
      purchaseDate,
      validUntil: durationType === "LIFETIME" ? null : validUntil,
      status: statusValue(text(formData, "status")),
      supplier: text(formData, "supplier") || null,
      buyerName: text(formData, "buyerName") || null,
      buyerPhone: text(formData, "buyerPhone") || null,
      unitId: unitId || null,
      laptopSeries: text(formData, "laptopSeries") || null,
      salePrice: Math.max(0, numberValue(formData, "salePrice")),
      costPrice: Math.max(0, numberValue(formData, "costPrice")),
      notes: text(formData, "notes") || null,
      createdById: dbUser?.id ?? null
    }
  });

  revalidatePath("/licenses");
  redirect("/licenses?success=created");
}
