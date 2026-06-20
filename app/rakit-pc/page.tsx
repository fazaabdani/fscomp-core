import Link from "next/link";
import { Boxes, ClipboardList, Cpu, Edit3 } from "lucide-react";
import { formatRupiah } from "@/lib/api";
import { pcCategoryLabels } from "@/lib/pc-builder";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createPcPresetAction, togglePcComponentAction, togglePcPresetAction, updatePcDraftStatusAction } from "./actions";
import { PcComponentForm } from "./PcComponentForm";
import "./admin.css";

export const dynamic = "force-dynamic";
export default async function PcBuilderAdminPage({ searchParams }: { searchParams?: Record<string,string|undefined> }) {
  requireRole(["admin","sales"]);
  const [components,presets,drafts,inventory] = await Promise.all([
    prisma.pcComponent.findMany({orderBy:[{active:"desc"},{category:"asc"},{name:"asc"}],include:{inventoryItem:{select:{serialNumber:true,status:true}}}}),
    prisma.pcBuildPreset.findMany({orderBy:{name:"asc"},include:{items:true}}),
    prisma.pcBuildDraft.findMany({take:30,orderBy:{createdAt:"desc"},include:{items:true}}),
    prisma.inventoryItem.findMany({where:{status:"STOCK",pcComponent:null},orderBy:{name:"asc"},select:{id:true,name:true,brandModel:true,serialNumber:true,costPrice:true}})
  ]);
  return <section className="pageStack pcAdminPage">
    <div className="pageTitle"><div><p className="eyebrow">Rakit PC</p><h1>Komponen, preset, dan draft</h1><p>Komponen bertaut inventaris mengikuti status stok. Draft pengunjung tidak mengubah inventaris.</p></div><Cpu size={34}/></div>
    {searchParams?.saved ? <div className="successBox">Data Rakit PC berhasil disimpan.</div>:null}
    {searchParams?.error ? <div className="infoBox dangerInfo">Data belum lengkap, komponen paket ganda/tidak kompatibel, atau nilai unik sudah digunakan.</div>:null}
    <div className="statsGrid"><div className="metric"><Boxes/><strong>{components.filter(i=>i.active).length}</strong><span>Komponen aktif</span></div><div className="metric"><Cpu/><strong>{presets.length}</strong><span>Preset</span></div><div className="metric"><ClipboardList/><strong>{drafts.filter(i=>i.status==="NEW").length}</strong><span>Draft baru</span></div></div>
    <div className="pcAdminGrid">
      <PcComponentForm inventory={inventory}/>
      <section className="panel pcAdminListPanel"><div className="panelHeader"><div><p className="eyebrow">Data aktif</p><h2>Daftar komponen</h2></div></div><div className="tableLike compact">{components.length===0?<div className="emptyState">Belum ada komponen.</div>:components.map(item=><div className="unitRow" key={item.id}><span className="unitNumber">{pcCategoryLabels[item.category]}</span><span><strong>{item.name}</strong><small>{item.specification||"-"} {item.inventoryItem ? `/ Inventaris ${item.inventoryItem.status}`:"/ katalog manual"}</small></span><b>{formatRupiah(item.salePrice)}</b><div className="buttonRow noMargin"><Link className="secondaryButton compactButton" href={`/rakit-pc/components/${item.id}/edit`}><Edit3 size={14}/> Edit</Link><form action={togglePcComponentAction.bind(null,item.id)}><button className="secondaryButton compactButton" type="submit">{item.active?"Nonaktifkan":"Aktifkan"}</button></form></div></div>)}</div></section>
      <form className="panel formGrid pcPresetEditor" action={createPcPresetAction}><div className="panelHeader"><div><p className="eyebrow">Paket pilihan</p><h2>Buat preset</h2></div></div><div className="formGrid twoColumns"><label>Nama<input name="name" required placeholder="Gaming Hemat"/></label><label>Slug<input name="slug" required placeholder="gaming-hemat"/></label><label>Kebutuhan<input name="useCase" required placeholder="Gaming 1080p"/></label><label>Deskripsi<input name="description" placeholder="Cocok untuk..."/></label></div><div className="checkboxGrid">{components.filter(i=>i.active).map(item=><label key={item.id}><input type="checkbox" name="componentId" value={item.id}/>{pcCategoryLabels[item.category]} - {item.name}</label>)}</div><button className="primaryButton" type="submit">Simpan Preset</button></form>
      <section className="panel pcAdminListPanel"><div className="panelHeader"><div><p className="eyebrow">Paket tersimpan</p><h2>Daftar preset</h2></div></div><div className="tableLike compact">{presets.length===0?<div className="emptyState">Belum ada preset.</div>:presets.map(preset=><div className="unitRow" key={preset.id}><span className="unitNumber">{preset.active?"AKTIF":"NONAKTIF"}</span><span><strong>{preset.name}</strong><small>{preset.useCase} / {preset.items.length} komponen</small></span><form action={togglePcPresetAction.bind(null,preset.id)}><button className="secondaryButton compactButton" type="submit">{preset.active?"Nonaktifkan":"Aktifkan"}</button></form></div>)}</div></section>
    </div>
    <section className="panel"><div className="panelHeader"><div><p className="eyebrow">Follow-up sales</p><h2>Draft penawaran terbaru</h2></div></div><div className="paymentRows">{drafts.length===0?<div className="emptyState">Belum ada draft dari pengunjung.</div>:drafts.map(draft=><div className="paymentRow" key={draft.id}><span>{draft.referenceCode}</span><div><strong>{draft.customerName||"Pengunjung"} / {draft.customerPhone||"tanpa nomor"}</strong><small>{draft.presetName||"Custom"} / {draft.need||"kebutuhan belum diisi"} / {draft.items.length} komponen</small></div><b>{formatRupiah(draft.totalPrice)}</b><form action={updatePcDraftStatusAction.bind(null,draft.id)} className="buttonRow noMargin"><select name="status" defaultValue={draft.status}>{["NEW","CONTACTED","QUOTED","CONFIRMED","CANCELLED"].map(status=><option key={status}>{status}</option>)}</select><button className="secondaryButton compactButton" type="submit">Update</button></form></div>)}</div></section>
  </section>;
}
