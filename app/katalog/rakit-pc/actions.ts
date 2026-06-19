"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getPcCompatibilityIssues } from "@/lib/pc-compatibility";

function text(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function limitedText(formData:FormData,key:string,max:number){return text(formData,key).slice(0,max);}
function positiveNumber(value: FormDataEntryValue | null) {
  const number = Number(value); return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

export async function createPcBuildDraftAction(formData: FormData) {
  if(text(formData,"website"))redirect("/katalog/rakit-pc?error=invalid");
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
  if (getPcCompatibilityIssues(components).some((issue) => issue.level === "bad")) redirect("/katalog/rakit-pc?error=compatibility");

  const customerPhone=limitedText(formData,"customerPhone",20).replace(/\D/g,"");
  if(customerPhone.length<9||customerPhone.length>15)redirect("/katalog/rakit-pc?error=phone");
  const recentDrafts=await prisma.pcBuildDraft.count({where:{customerPhone,createdAt:{gte:new Date(Date.now()-15*60*1000)}}});
  if(recentDrafts>=3)redirect("/katalog/rakit-pc?error=rate-limit");
  const referenceCode = `RPC-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const totalPrice = components.reduce((sum, component) => sum + component.salePrice, 0);
  await prisma.pcBuildDraft.create({
    data: {
      referenceCode,
      presetName: text(formData, "presetName") || null,
      customerName: limitedText(formData,"customerName",100)||null,
      customerPhone,
      need: limitedText(formData,"need",300)||null,
      budget: Math.min(1_000_000_000,positiveNumber(formData.get("budget"))??0)||null,totalPrice,
      notes: limitedText(formData,"notes",1000)||null,
      items: { create: components.map((component) => ({
        componentId: component.id, category: component.category,
        componentName: component.name, unitPrice: component.salePrice
      })) }
    }
  });
  redirect(`/katalog/rakit-pc?draft=${encodeURIComponent(referenceCode)}`);
}
