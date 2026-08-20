"use server";

import type { PcBuildDraftStatus, PcComponentCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPcCompatibilityIssues } from "@/lib/pc-compatibility";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { entityId, nonNegativeInteger, requiredText, z } from "@/lib/form-validation";

function text(data:FormData,key:string){return String(data.get(key)??"").trim();}
function int(data:FormData,key:string){const value=Number(data.get(key));return Number.isFinite(value)?Math.max(0,Math.round(value)):0;}
function list(data:FormData,key:string){return text(data,key).split(",").map(value=>value.trim()).filter(Boolean);}
function intList(data:FormData,key:string){return list(data,key).map(Number).filter(value=>Number.isFinite(value)&&value>0);}
const categories=["CPU","MOTHERBOARD","RAM","STORAGE","GPU","PSU","CASING","COOLER","MONITOR","ACCESSORY"];
const requiredPresetCategories=["CPU","MOTHERBOARD","RAM","STORAGE","PSU","CASING"];
const componentSchema=z.object({name:requiredText(200),category:z.enum(["CPU","MOTHERBOARD","RAM","STORAGE","GPU","PSU","CASING","COOLER","MONITOR","ACCESSORY"]),salePrice:nonNegativeInteger});
function category(value:string){return(categories.includes(value)?value:"ACCESSORY") as PcComponentCategory;}

function componentData(data:FormData){
  return {name:text(data,"name"),category:category(text(data,"category")),brand:text(data,"brand")||null,specification:text(data,"specification")||null,salePrice:int(data,"salePrice"),socket:text(data,"socket")||null,supportedSockets:list(data,"supportedSockets"),memoryType:text(data,"memoryType")||null,formFactor:text(data,"formFactor")||null,supportedFormFactors:list(data,"supportedFormFactors"),storageInterface:text(data,"storageInterface")||null,supportedStorageInterfaces:list(data,"supportedStorageInterfaces"),powerDraw:int(data,"powerDraw")||null,psuCapacity:int(data,"psuCapacity")||null,gpuLengthMm:int(data,"gpuLengthMm")||null,maxGpuLengthMm:int(data,"maxGpuLengthMm")||null,coolerHeightMm:int(data,"coolerHeightMm")||null,maxCoolerHeightMm:int(data,"maxCoolerHeightMm")||null,radiatorSizeMm:int(data,"radiatorSizeMm")||null,supportedRadiatorSizes:intList(data,"supportedRadiatorSizes"),inventoryItemId:text(data,"inventoryItemId")||null};
}

function componentError(item:ReturnType<typeof componentData>){
  if(!item.name||item.salePrice<=0)return"required";
  if(["CPU","MOTHERBOARD"].includes(item.category)&&!item.socket)return"socket";
  if(["CPU","MOTHERBOARD","RAM"].includes(item.category)&&!item.memoryType)return"memory";
  if(item.category==="MOTHERBOARD"&&!item.formFactor)return"form-factor";
  if(item.category==="PSU"&&!item.psuCapacity)return"psu-capacity";
  if(item.category==="CASING"&&!item.supportedFormFactors.length)return"case-form-factor";
  if(item.category==="COOLER"&&!item.supportedSockets.length)return"cooler-socket";
  return"";
}

function revalidatePcBuilder(){revalidatePath("/rakit-pc");revalidatePath("/katalog/rakit-pc");}

export async function createPcComponentAction(data:FormData){
  await requireRole(["admin","sales"]);const item=componentData(data);if(!componentSchema.safeParse(item).success)redirect("/rakit-pc?view=components&error=invalid-input");const error=componentError(item);if(error)redirect(`/rakit-pc?view=components&error=${error}`);
  await prisma.pcComponent.create({data:item});revalidatePcBuilder();redirect("/rakit-pc?view=components&saved=component");
}

export async function updatePcComponentAction(id:string,data:FormData){
  await requireRole(["admin","sales"]);const item=componentData(data);if(!entityId.safeParse(id).success||!componentSchema.safeParse(item).success)redirect(`/rakit-pc/components/${id}/edit?error=invalid-input`);const error=componentError(item);if(error)redirect(`/rakit-pc/components/${id}/edit?error=${error}`);
  await prisma.pcComponent.update({where:{id},data:item});revalidatePcBuilder();revalidatePath(`/rakit-pc/components/${id}/edit`);redirect("/rakit-pc?view=components&saved=component-updated");
}

export async function togglePcComponentAction(id:string){await requireRole(["admin","sales"]);if(!entityId.safeParse(id).success)return;const item=await prisma.pcComponent.findUnique({where:{id},select:{active:true}});if(item)await prisma.pcComponent.update({where:{id},data:{active:!item.active}});revalidatePcBuilder();}

export async function createPcPresetAction(data:FormData){
  await requireRole(["admin","sales"]);const name=text(data,"name");const slug=text(data,"slug").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");const ids=Array.from(new Set(data.getAll("componentId").map(String).filter(Boolean)));if(!z.object({name:requiredText(200),slug:z.string().min(1).max(200),ids:z.array(entityId).min(6).max(12)}).safeParse({name,slug,ids}).success)redirect("/rakit-pc?view=presets&error=invalid-input");if(!name||!slug)redirect("/rakit-pc?view=presets&error=preset");
  const components=await prisma.pcComponent.findMany({where:{id:{in:ids},active:true}});const selectedCategories=new Set<string>(components.map(item=>item.category));
  if(components.length!==ids.length||selectedCategories.size!==components.length||requiredPresetCategories.some(item=>!selectedCategories.has(item)))redirect("/rakit-pc?view=presets&error=preset-components");
  if(getPcCompatibilityIssues(components).some(issue=>issue.level==="bad"))redirect("/rakit-pc?view=presets&error=preset-compatibility");
  await prisma.pcBuildPreset.create({data:{name,slug,useCase:text(data,"useCase")||"Custom",description:text(data,"description")||null,items:{create:components.map(item=>({componentId:item.id}))}}});revalidatePcBuilder();redirect("/rakit-pc?view=presets&saved=preset");
}

export async function togglePcPresetAction(id:string){await requireRole(["admin","sales"]);if(!entityId.safeParse(id).success)return;const preset=await prisma.pcBuildPreset.findUnique({where:{id},select:{active:true}});if(preset)await prisma.pcBuildPreset.update({where:{id},data:{active:!preset.active}});revalidatePcBuilder();}

export async function updatePcDraftStatusAction(id:string,data:FormData){await requireRole(["admin","sales"]);const value=text(data,"status") as PcBuildDraftStatus;if(!entityId.safeParse(id).success||!z.enum(["NEW","CONTACTED","QUOTED","CONFIRMED","CANCELLED"]).safeParse(value).success)return;if(["NEW","CONTACTED","QUOTED","CONFIRMED","CANCELLED"].includes(value))await prisma.pcBuildDraft.update({where:{id},data:{status:value}});revalidatePath("/rakit-pc");}
