import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { PcComponentForm } from "../../../PcComponentForm";

export const dynamic="force-dynamic";

export default async function EditPcComponentPage({params,searchParams}:{params:{id:string};searchParams?:Record<string,string|undefined>}){
  requireRole(["admin","sales"]);
  const component=await prisma.pcComponent.findUnique({where:{id:params.id}});if(!component)notFound();
  const inventory=await prisma.inventoryItem.findMany({where:{status:"STOCK",OR:[{pcComponent:null},{id:component.inventoryItemId??"__none__"}]},orderBy:{name:"asc"},select:{id:true,name:true,brandModel:true,serialNumber:true}});
  return <section className="pageStack"><div className="pageTitle"><div><p className="eyebrow">Rakit PC</p><h1>Edit {component.name}</h1><p>Perubahan harga dan kompatibilitas langsung memengaruhi builder publik.</p></div><Link className="secondaryButton" href="/rakit-pc?view=components">Kembali ke Komponen</Link></div>{searchParams?.error?<div className="infoBox dangerInfo">Field wajib untuk kategori ini belum lengkap.</div>:null}<PcComponentForm inventory={inventory} component={component}/></section>;
}
