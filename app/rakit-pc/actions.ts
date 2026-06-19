"use server";

import type { PcBuildDraftStatus, PcComponentCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

function text(data: FormData, key: string) { return String(data.get(key) ?? "").trim(); }
function int(data: FormData, key: string) { const value = Number(data.get(key)); return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0; }
const categories = ["CPU","MOTHERBOARD","RAM","STORAGE","GPU","PSU","CASING","COOLER","MONITOR","ACCESSORY"];
function category(value: string) { return (categories.includes(value) ? value : "ACCESSORY") as PcComponentCategory; }

export async function createPcComponentAction(data: FormData) {
  requireRole(["admin", "sales"]); const name = text(data, "name"); if (!name) redirect("/rakit-pc?error=name");
  await prisma.pcComponent.create({ data: { name, category: category(text(data,"category")), brand:text(data,"brand")||null, specification:text(data,"specification")||null, salePrice:int(data,"salePrice"), socket:text(data,"socket")||null, memoryType:text(data,"memoryType")||null, formFactor:text(data,"formFactor")||null, wattage:int(data,"wattage")||null, inventoryItemId:text(data,"inventoryItemId")||null } });
  revalidatePath("/rakit-pc"); revalidatePath("/katalog/rakit-pc"); redirect("/rakit-pc?saved=component");
}
export async function togglePcComponentAction(id: string) { requireRole(["admin","sales"]); const item=await prisma.pcComponent.findUnique({where:{id},select:{active:true}}); if(item) await prisma.pcComponent.update({where:{id},data:{active:!item.active}}); revalidatePath("/rakit-pc"); revalidatePath("/katalog/rakit-pc"); }
export async function createPcPresetAction(data: FormData) {
  requireRole(["admin","sales"]); const name=text(data,"name"); const slug=text(data,"slug").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); if(!name||!slug) redirect("/rakit-pc?error=preset");
  await prisma.pcBuildPreset.create({data:{name,slug,useCase:text(data,"useCase")||"Custom",description:text(data,"description")||null,items:{create:data.getAll("componentId").map(String).filter(Boolean).map(componentId=>({componentId}))}}}); revalidatePath("/rakit-pc"); revalidatePath("/katalog/rakit-pc"); redirect("/rakit-pc?saved=preset");
}
export async function updatePcDraftStatusAction(id:string,data:FormData){ requireRole(["admin","sales"]); const value=text(data,"status") as PcBuildDraftStatus; if(["NEW","CONTACTED","QUOTED","CONFIRMED","CANCELLED"].includes(value)) await prisma.pcBuildDraft.update({where:{id},data:{status:value}}); revalidatePath("/rakit-pc"); }
