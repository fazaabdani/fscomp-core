import Link from "next/link";
import { Cpu, ShieldCheck, WalletCards } from "lucide-react";
import { getPublicPcBuilderData } from "@/lib/pc-builder";
import { PcBuilder } from "./PcBuilder";
import "./pc-builder.css";

export const dynamic = "force-dynamic";
function param(value?: string | string[]) { return Array.isArray(value) ? value[0] : value; }

export default async function RakitPcCatalogPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const { connected, components, presets } = await getPublicPcBuilderData();
  return <section className="pageStack pcCatalogPage">
    <div className="pcBuilderHero">
      <div><span className="catalogHeroPill"><Cpu size={16} /> Rakit PC FS Comp</span><h1>Susun PC sesuai kebutuhan dan budget</h1><p>Pilih preset atau rakit sendiri. Harga dan ketersediaan komponen terhubung ke Core, lalu admin akan memverifikasi konfigurasi sebelum transaksi.</p><div className="buttonRow"><a className="primaryButton" href="#builder">Mulai Rakit</a><Link className="secondaryButton" href="/katalog">Katalog Laptop</Link></div></div>
      <div className="pcHeroFacts"><span><WalletCards size={20} /><strong>Harga transparan</strong><small>Total dihitung otomatis</small></span><span><ShieldCheck size={20} /><strong>Stok tetap aman</strong><small>Simulasi tidak mengurangi stok</small></span></div>
    </div>
    {!connected ? <div className="infoBox dangerInfo">Data Rakit PC belum tersedia. Jalankan migration database lalu tambahkan komponen dari menu internal.</div> : null}
    {searchParams?.error ? <div className="infoBox dangerInfo">Draft tidak dapat disimpan karena komponen kosong atau stoknya berubah. Silakan pilih ulang.</div> : null}
    <div id="builder"><PcBuilder components={components} presets={presets} draftCode={param(searchParams?.draft)} /></div>
    <p className="pcDisclaimer">Harga merupakan estimasi dan dapat berubah mengikuti stok. Draft bukan reservasi dan belum mengurangi inventaris.</p>
  </section>;
}
