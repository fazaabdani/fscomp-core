import Link from "next/link";
import { MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { formatRupiah } from "@/lib/api";
import { getCatalogPageData } from "@/lib/db-data";

export const dynamic = "force-dynamic";

function waLink(unit: { nomorUnit: string; model: string; hargaJualRekomendasi: number }) {
  const text = [
    "Assalamu'alaikum FS Comp.",
    `Saya tertarik dengan Unit ${unit.nomorUnit} - ${unit.model}.`,
    `Harga di katalog: ${formatRupiah(unit.hargaJualRekomendasi)}.`,
    "Apakah unitnya masih ready?"
  ].join("\n");
  return `https://wa.me/62816692428?text=${encodeURIComponent(text)}`;
}

function CatalogSection({
  title,
  subtitle,
  units
}: {
  title: string;
  subtitle: string;
  units: Array<{
    id: string;
    nomorUnit: string;
    model: string;
    processor: string;
    ram: string;
    ssd: string;
    lcdSize: string;
    lcdResolution: string;
    isTouchscreen: boolean;
    hargaJualRekomendasi: number;
    stockLocation: string;
    ssdHealth: number;
    batteryHealth: number;
    windowsVersion: string;
    screenCondition: string;
    officeStatus: string;
  }>;
}) {
  return (
    <section className="panel catalogPublicSection">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">{subtitle}</p>
          <h2>{title}</h2>
        </div>
        <MapPin size={22} />
      </div>
      <div className="catalogPublicGrid">
        {units.length === 0 ? <div className="emptyState">Belum ada unit siap jual di lokasi ini.</div> : units.map((unit) => (
          <article className="catalogPublicCard" key={unit.id}>
            <div className="catalogCardTop">
              <span className="unitNumber">{unit.nomorUnit}</span>
              <span className="statusPill green">{unit.stockLocation}</span>
            </div>
            <h3>{unit.model}</h3>
            <p>{unit.processor} / {unit.ram} / {unit.ssd}</p>
            <div className="miniMetrics">
              <span>SSD {unit.ssdHealth}%</span>
              <span>Battery {unit.batteryHealth}%</span>
              <span>{unit.windowsVersion}</span>
            </div>
            <div className="catalogSpecList">
              <span>LCD {unit.lcdSize} {unit.lcdResolution}</span>
              <span>Layar {unit.screenCondition}</span>
              <span>{unit.isTouchscreen ? "Touchscreen" : "Non-touchscreen"}</span>
              <span>Office {unit.officeStatus}</span>
            </div>
            <strong className="catalogPrice">{formatRupiah(unit.hargaJualRekomendasi)}</strong>
            <div className="buttonRow">
              <Link className="secondaryButton" href={`/unit/${unit.id}`}>Detail QC</Link>
              <a className="primaryButton" href={waLink(unit)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Tanya Unit</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function KatalogPage() {
  const { wiradesaUnits, kajenUnits, connected } = await getCatalogPageData();
  const total = wiradesaUnits.length + kajenUnits.length;

  return (
    <section className="pageStack katalogPage">
      <div className="catalogHero">
        <div>
          <p className="eyebrow">Katalog FS Comp</p>
          <h1>Laptop second siap jual, QC jelas</h1>
          <p className="heroCopy">Unit yang tampil di sini sudah lolos QC harian terakhir, belum terjual, dan siap ditanyakan ke FS Comp.</p>
        </div>
        <div className="catalogHeroBadge">
          <ShieldCheck size={24} />
          <strong>{total}</strong>
          <span>unit ready</span>
          <small>Wiradesa utama</small>
        </div>
      </div>

      {!connected ? (
        <div className="infoBox dangerInfo">Katalog belum tersambung ke database production.</div>
      ) : null}

      <CatalogSection title="Stok Wiradesa" subtitle="Lokasi utama" units={wiradesaUnits} />
      <CatalogSection title="Stok Kajen" subtitle="Lokasi secondary" units={kajenUnits} />
    </section>
  );
}
