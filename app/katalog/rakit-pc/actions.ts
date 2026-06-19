"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function positiveNumber(value: FormDataEntryValue | null) {
  const number = Number(value); return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

export async function createPcBuildDraftAction(formData: FormData) {
  const componentIds = Array.from(new Set(formData.getAll("componentId").map(String).filter(Boolean)));
  if (!componentIds.length) redirect("/katalog/rakit-pc?error=components");

  const components = await prisma.pcComponent.findMany({
    where: { id: { in: componentIds }, active: true, OR: [{ inventoryItemId: null }, { inventoryItem: { status: "STOCK" } }] }
  });
  if (components.length !== componentIds.length) redirect("/katalog/rakit-pc?error=availability");
  const requiredCategories = ["CPU", "MOTHERBOARD", "RAM", "STORAGE", "PSU", "CASING"];
  const selectedCategories = new Set<string>(components.map((component) => component.category));
  if (selectedCategories.size !== components.length || requiredCategories.some((category) => !selectedCategories.has(category))) {
    redirect("/katalog/rakit-pc?error=components");
  }

  const referenceCode = `RPC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const totalPrice = components.reduce((sum, component) => sum + component.salePrice, 0);
  await prisma.pcBuildDraft.create({
    data: {
      referenceCode,
      presetName: text(formData, "presetName") || null,
      customerName: text(formData, "customerName") || null,
      customerPhone: text(formData, "customerPhone") || null,
      need: text(formData, "need") || null,
      budget: positiveNumber(formData.get("budget")), totalPrice,
      notes: text(formData, "notes") || null,
      items: { create: components.map((component) => ({
        componentId: component.id, category: component.category,
        componentName: component.name, unitPrice: component.salePrice
      })) }
    }
  });
  redirect(`/katalog/rakit-pc?draft=${encodeURIComponent(referenceCode)}`);
}
