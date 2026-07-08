import type { Metadata } from "next";
import Link from "next/link";
import { Cpu } from "lucide-react";
import { getPublicPcBuilderData } from "@/lib/pc-builder";
import { PcBuilder } from "./PcBuilder";
import "./pc-builder.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rakit PC Custom Pekalongan | FS Comp",
  description: "Rakit PC sesuai budget dan kebutuhan di Pekalongan. Cek kompatibilitas komponen otomatis, estimasi harga & daya, QC ketat, garansi rakitan 1 tahun.",
  keywords: ["rakit pc pekalongan", "rakit komputer pekalongan", "PC custom pekalongan", "FS Comp"],
  alternates: { canonical: "/katalog/rakit-pc" },
  openGraph: {
    title: "Rakit PC Custom Pekalongan | FS Comp",
    description: "Rakit PC sesuai budget dan kebutuhan di Pekalongan. Cek kompatibilitas otomatis, QC ketat, garansi rakitan 1 tahun.",
    url: "/katalog/rakit-pc",
    siteName: "FS Comp",
    locale: "id_ID",
    type: "website"
  }
};
function param(value?: string | string[]) { return Array.isArray(value) ? value[0] : value; }
function errorMessage(value?:string|string[]){const error=param(value);if(error==="phone")return"Nomor WhatsApp wajib diisi dengan 9–15 digit.";if(error==="rate-limit")return"Terlalu banyak draft dari nomor ini. Coba lagi setelah 15 menit atau gunakan WhatsApp.";if(error==="compatibility")return"Konfigurasi tidak kompatibel. Periksa kembali komponen yang dipilih.";return error?"Draft tidak dapat disimpan karena data, komponen, atau stok berubah. Silakan periksa kembali.":"";}

export default async function RakitPcCatalogPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const { connected, components, presets } = await getPublicPcBuilderData();
  return <section className="pageStack pcCatalogPage">
    <div className="pcBuilderHero">
      <div className="pcHeroMain"><span className="catalogHeroPill"><Cpu size={16} /> Rakit PC Custom — FS Comp</span><h1>Rakit PC <span>Sesuai Kebutuhan</span> Panjenengan</h1><p>Pilih paket rekomendasi yang sudah teruji, atau rakit dari nol. Sistem otomatis mengecek kompatibilitas, daya, dan total harga. Rakitan dikerjakan teknisi FS Comp dengan QC ketat.</p><div className="buttonRow"><a className="primaryButton" href="#builder">Mulai Rakit →</a><a className="secondaryButton" href="https://wa.me/62816660056" target="_blank" rel="noreferrer">Chat Admin</a><Link className="secondaryButton" href="/katalog">Katalog Laptop</Link></div></div>
      <div className="pcHeroStats"><div><strong>10</strong><span>Kategori komponen</span></div><div><strong>{presets.length}</strong><span>Paket rekomendasi</span></div><div><strong>5–7</strong><span>Hari pengerjaan</span></div><div><strong>1th</strong><span>Garansi rakitan</span></div></div>
    </div>
    <div className="pcFeatureStrip">{["QC ketat sebelum serah terima","Garansi rakitan","Cek kompatibilitas otomatis","Pre-order 5–7 hari","Harga update dari Core","Chat admin cepat"].map(item=><span key={item}><i/>{item}</span>)}</div>
    {!connected ? <div className="infoBox dangerInfo">Data Rakit PC belum tersedia. Jalankan migration database lalu tambahkan komponen dari menu internal.</div> : null}
    {searchParams?.error ? <div className="infoBox dangerInfo">{errorMessage(searchParams.error)}</div> : null}
    <div id="builder"><PcBuilder components={components} presets={presets} draftCode={param(searchParams?.draft)} /></div>
    <p className="pcDisclaimer">Harga merupakan estimasi dan dapat berubah mengikuti stok. Draft bukan reservasi dan belum mengurangi inventaris.</p>
  </section>;
}
