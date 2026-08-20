import Link from "next/link";
import { ArrowRight, Boxes, ClipboardList, Cpu, Edit3, ExternalLink, LayoutDashboard, PackageCheck } from "lucide-react";
import { formatRupiah } from "@/lib/api";
import { pcCategoryLabels } from "@/lib/pc-builder";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { createPcPresetAction, togglePcComponentAction, togglePcPresetAction, updatePcDraftStatusAction } from "./actions";
import { PcComponentForm } from "./PcComponentForm";
import "./admin.css";

export const dynamic = "force-dynamic";

type AdminView = "overview" | "components" | "presets" | "drafts";

const draftStatuses = ["NEW", "CONTACTED", "QUOTED", "CONFIRMED", "CANCELLED"];
const draftStatusLabels: Record<string,string> = { NEW:"Baru",CONTACTED:"Dihubungi",QUOTED:"Ditawari",CONFIRMED:"Dikonfirmasi",CANCELLED:"Dibatalkan" };

function activeView(value?:string):AdminView {
  if(value==="components"||value==="presets"||value==="drafts")return value;
  return "overview";
}

function AdminTabs({view,componentCount,presetCount,draftCount}:{view:AdminView;componentCount:number;presetCount:number;draftCount:number}) {
  const tabs=[
    {id:"overview",label:"Ringkasan",icon:LayoutDashboard,count:null},
    {id:"components",label:"Komponen",icon:Boxes,count:componentCount},
    {id:"presets",label:"Paket",icon:PackageCheck,count:presetCount},
    {id:"drafts",label:"Draft Pelanggan",icon:ClipboardList,count:draftCount}
  ] as const;
  return <nav className="pcAdminTabs" aria-label="Menu pengelolaan Rakit PC">{tabs.map(tab=>{const Icon=tab.icon;return <Link className={view===tab.id?"active":""} href={tab.id==="overview"?"/rakit-pc":`/rakit-pc?view=${tab.id}`} key={tab.id}><Icon size={17}/><span>{tab.label}</span>{tab.count!==null?<b>{tab.count}</b>:null}</Link>})}</nav>;
}

export default async function PcBuilderAdminPage({searchParams}:{searchParams?:Record<string,string|undefined>}) {
  await requireRole(["admin","sales"]);
  const view=activeView(searchParams?.view);
  const [components,presets,drafts,inventory]=await Promise.all([
    prisma.pcComponent.findMany({orderBy:[{active:"desc"},{category:"asc"},{name:"asc"}],include:{inventoryItem:{select:{serialNumber:true,status:true}}}}),
    prisma.pcBuildPreset.findMany({orderBy:[{active:"desc"},{name:"asc"}],include:{items:true}}),
    prisma.pcBuildDraft.findMany({take:50,orderBy:{createdAt:"desc"},include:{items:true}}),
    prisma.inventoryItem.findMany({where:{status:"STOCK",pcComponent:null},orderBy:{name:"asc"},select:{id:true,name:true,brandModel:true,serialNumber:true}})
  ]);
  const activeComponents=components.filter(item=>item.active).length;
  const activePresets=presets.filter(item=>item.active).length;
  const newDrafts=drafts.filter(item=>item.status==="NEW").length;

  return <section className="pageStack pcAdminPage">
    <div className="pageTitle pcAdminHero"><div><p className="eyebrow">Rakit PC</p><h1>Studio Rakit PC</h1><p>Kelola stok komponen, paket rekomendasi, dan calon pelanggan dari satu tempat.</p></div><div className="pcHeroActions"><Link className="secondaryButton" href="/katalog/rakit-pc" target="_blank">Lihat Halaman Publik <ExternalLink size={15}/></Link><Cpu size={34}/></div></div>

    {searchParams?.saved?<div className="successBox">Data Rakit PC berhasil disimpan.</div>:null}
    {searchParams?.error?<div className="infoBox dangerInfo">Data belum lengkap, komponen paket ganda/tidak kompatibel, atau nilai unik sudah digunakan.</div>:null}

    <AdminTabs view={view} componentCount={activeComponents} presetCount={activePresets} draftCount={newDrafts}/>

    {view==="overview"?<>
      <div className="pcQuickGrid">
        <Link className="pcQuickCard cyan" href="/rakit-pc?view=components"><span><Boxes size={21}/><b>{activeComponents}</b></span><strong>Kelola Komponen</strong><small>Tambah harga, spesifikasi, stok, dan aturan kompatibilitas.</small><em>Buka komponen <ArrowRight size={15}/></em></Link>
        <Link className="pcQuickCard blue" href="/rakit-pc?view=presets"><span><PackageCheck size={21}/><b>{activePresets}</b></span><strong>Atur Paket Rekomendasi</strong><small>Susun paket Office, Gaming, Editing, Warnet, atau Custom.</small><em>Buka paket <ArrowRight size={15}/></em></Link>
        <Link className="pcQuickCard amber" href="/rakit-pc?view=drafts"><span><ClipboardList size={21}/><b>{newDrafts}</b></span><strong>Follow-up Pelanggan</strong><small>Periksa konfigurasi baru dan lanjutkan menjadi quotation.</small><em>Lihat draft <ArrowRight size={15}/></em></Link>
      </div>
      <section className="panel pcOverviewPanel"><div className="panelHeader"><div><p className="eyebrow">Aktivitas terbaru</p><h2>Draft yang perlu diperhatikan</h2></div><Link className="secondaryButton compactButton" href="/rakit-pc?view=drafts">Lihat Semua</Link></div><div className="paymentRows">{drafts.length===0?<div className="emptyState">Belum ada draft pelanggan.</div>:drafts.slice(0,5).map(draft=><div className="paymentRow pcDraftRow" key={draft.id}><span>{draft.referenceCode}</span><div><strong>{draft.customerName||"Pengunjung"}</strong><small>{draft.presetName||"Custom"} / {draft.items.length} komponen</small></div><b>{formatRupiah(draft.totalPrice)}</b><span className={`pcDraftStatus ${draft.status.toLowerCase()}`}>{draftStatusLabels[draft.status]}</span></div>)}</div></section>
    </>:null}

    {view==="components"?<div className="pcAdminGrid pcViewPanel">
      <PcComponentForm inventory={inventory}/>
      <section className="panel pcAdminListPanel"><div className="panelHeader"><div><p className="eyebrow">Katalog komponen</p><h2>{components.length} item tersimpan</h2></div><span className="pcPanelCount">{activeComponents} aktif</span></div><div className="tableLike compact">{components.length===0?<div className="emptyState">Belum ada komponen. Isi form di sebelah kiri untuk memulai.</div>:components.map(item=><div className={`unitRow ${item.active?"":"pcInactiveRow"}`} key={item.id}><span className="unitNumber">{pcCategoryLabels[item.category]}</span><span><strong>{item.name}</strong><small>{item.specification||"Spesifikasi belum diisi"} {item.inventoryItem?`/ Inventaris ${item.inventoryItem.status}`:"/ pre-order"}</small></span><b>{formatRupiah(item.salePrice)}</b><div className="buttonRow noMargin"><Link className="secondaryButton compactButton" href={`/rakit-pc/components/${item.id}/edit`}><Edit3 size={14}/> Edit</Link><form action={togglePcComponentAction.bind(null,item.id)}><button className="secondaryButton compactButton" type="submit">{item.active?"Nonaktifkan":"Aktifkan"}</button></form></div></div>)}</div></section>
    </div>:null}

    {view==="presets"?<div className="pcAdminGrid pcViewPanel">
      <form className="panel formGrid pcPresetEditor" action={createPcPresetAction}><div className="panelHeader"><div><p className="eyebrow">Paket pilihan</p><h2>Buat paket baru</h2><p>Pilih satu komponen untuk setiap kategori yang diperlukan.</p></div></div><div className="formGrid twoColumns"><label>Nama<input name="name" required placeholder="Gaming Hemat"/></label><label>Slug<input name="slug" required placeholder="gaming-hemat"/></label><label>Kebutuhan<input name="useCase" required placeholder="Gaming 1080p"/></label><label>Deskripsi<input name="description" placeholder="Cocok untuk..."/></label></div><div className="checkboxGrid pcPresetChoices">{components.filter(item=>item.active).map(item=><label key={item.id}><input type="checkbox" name="componentId" value={item.id}/><span><strong>{pcCategoryLabels[item.category]}</strong>{item.name}</span></label>)}</div><button className="primaryButton" type="submit">Simpan Paket</button></form>
      <section className="panel pcAdminListPanel"><div className="panelHeader"><div><p className="eyebrow">Paket publik</p><h2>{presets.length} paket tersimpan</h2></div><span className="pcPanelCount">{activePresets} aktif</span></div><div className="tableLike compact">{presets.length===0?<div className="emptyState">Belum ada paket rekomendasi.</div>:presets.map(preset=><div className={`unitRow ${preset.active?"":"pcInactiveRow"}`} key={preset.id}><span className="unitNumber">{preset.active?"AKTIF":"NONAKTIF"}</span><span><strong>{preset.name}</strong><small>{preset.useCase} / {preset.items.length} komponen</small></span><form action={togglePcPresetAction.bind(null,preset.id)}><button className="secondaryButton compactButton" type="submit">{preset.active?"Nonaktifkan":"Aktifkan"}</button></form></div>)}</div></section>
    </div>:null}

    {view==="drafts"?<section className="panel pcViewPanel"><div className="panelHeader"><div><p className="eyebrow">Pipeline sales</p><h2>Draft penawaran pelanggan</h2><p>Ubah status setelah pelanggan dihubungi atau quotation dikirim.</p></div><span className="pcPanelCount">{newDrafts} baru</span></div><div className="paymentRows">{drafts.length===0?<div className="emptyState">Belum ada draft dari pengunjung.</div>:drafts.map(draft=><div className="paymentRow pcDraftRow" key={draft.id}><span>{draft.referenceCode}</span><div><strong>{draft.customerName||"Pengunjung"} / {draft.customerPhone||"tanpa nomor"}</strong><small>{draft.presetName||"Custom"} / {draft.need||"kebutuhan belum diisi"} / {draft.items.length} komponen</small></div><b>{formatRupiah(draft.totalPrice)}</b><form action={updatePcDraftStatusAction.bind(null,draft.id)} className="buttonRow noMargin"><select name="status" defaultValue={draft.status}>{draftStatuses.map(status=><option value={status} key={status}>{draftStatusLabels[status]}</option>)}</select><button className="secondaryButton compactButton" type="submit">Simpan</button></form></div>)}</div></section>:null}
  </section>;
}
