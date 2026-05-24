import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Cpu, HardDrive, MessageCircle, QrCode, ShieldCheck } from "lucide-react";
import { CatalogPhoto } from "@/app/components/CatalogPhoto";
import { formatRupiah } from "@/lib/api";
import { getUnitForDetail } from "@/lib/db-data";
import { statusTone } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function waLink(unit: { nomorUnit: string; model: string; hargaJualRekomendasi: number }) {
  const text = [
    "Assalamu'alaikum FS Comp.",
    `Saya tertarik dengan Unit ${unit.nomorUnit} - ${unit.model}.`,
    `Harga di katalog: ${formatRupiah(unit.hargaJualRekomendasi)}.`,
    "Apakah unitnya masih ready?"
  ].join("\n");
  return `https://wa.me/62816660056?text=${encodeURIComponent(text)}`;
}

export default async function UnitDetailPage({ params }: { params: { id: string } }) {
  const unit = await getUnitForDetail(params.id);
  if (!unit) notFound();

  const currentUser = getCurrentUser();
  const isInternalUser = Boolean(currentUser);
  const dailyHistory = unit.dailyHistory;
  const qcAwal = unit.qcAwal;
  const visibleHardware = qcAwal
    ? Object.entries(qcAwal.hardware).filter(([key]) => isInternalUser || key !== "Seri SSD")
    : [];
  const latestDaily = dailyHistory[0];
  const publicWindows = latestDaily?.windowsVersion ?? qcAwal?.software.Windows ?? "-";

  if (!isInternalUser) {
    return (
      <section className="pageStack">
        <div className="unitHero">
          <div>
            <p className="eyebrow">Katalog FS Comp</p>
            <h1>{unit.model}</h1>
            <p className="heroCopy">{unit.processor} / {unit.ram} / {unit.ssd}</p>
          </div>
          <div className="unitHeroActions">
            <span className={`statusPill ${statusTone[unit.statusObservasi as keyof typeof statusTone] ?? "yellow"}`}>{unit.statusObservasi}</span>
            <a className="primaryButton" href={waLink(unit)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Tanya Unit</a>
          </div>
        </div>

        <div className="contentGrid">
          <section className="panel wide">
            <CatalogPhoto
              url={unit.catalogImageUrl}
              className="publicUnitPhoto"
              placeholderClassName="publicUnitPhoto placeholderPhoto"
              alt={`Foto ${unit.model}`}
            />
          </section>

          <aside className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Spek umum</p>
                <h2>Unit siap jual</h2>
              </div>
            </div>
            <div className="detailList">
              <div><Cpu size={16} /> {unit.processor}</div>
              <div><HardDrive size={16} /> {unit.ram} / {unit.ssd}</div>
              <div><CalendarClock size={16} /> {publicWindows}</div>
            </div>
            <div className="kv"><span>LCD</span><strong>{unit.lcdSize}</strong></div>
            <div className="kv"><span>Resolusi</span><strong>{unit.lcdResolution}</strong></div>
            <div className="kv"><span>Touchscreen</span><strong>{unit.isTouchscreen ? "Ya" : "Tidak"}</strong></div>
            <div className="kv"><span>Lokasi stok</span><strong>{unit.stockLocation}</strong></div>
            <div className="kv"><span>Harga jual</span><strong>{formatRupiah(unit.hargaJualRekomendasi)}</strong></div>
          </aside>
        </div>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Catatan pembeli</p>
              <h2>QC internal sudah dicek FS Comp</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <p className="bodyText">Detail teknis seperti health SSD, health baterai, seri SSD, dan catatan internal disimpan di sistem FS Comp. Untuk kondisi spesifik unit, silakan tanyakan langsung ke admin sebelum transaksi.</p>
        </section>
      </section>
    );
  }

  return (
    <section className="pageStack">
      {isInternalUser ? <Link className="backLink" href="/"><ArrowLeft size={16} /> Kembali</Link> : null}

      <div className="unitHero">
        <div>
          <p className="eyebrow">{isInternalUser ? `Unit ${unit.nomorUnit}` : "Hasil pengecekan FS Comp"}</p>
          <h1>{unit.model}</h1>
          <p className="heroCopy">{unit.processor} / {unit.ram} / {unit.ssd}</p>
        </div>
        <div className="unitHeroActions">
          <span className={`statusPill ${statusTone[unit.statusObservasi as keyof typeof statusTone] ?? "yellow"}`}>{unit.statusObservasi}</span>
          {isInternalUser ? <Link className="primaryButton" href={`/label?unit=${unit.id}`}><QrCode size={17} /> Generate Label</Link> : null}
        </div>
      </div>

      <div className="contentGrid">
        <section className="panel wide">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Data masuk batch</p>
              <h2>Spek inti dari input awal</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <div className="qcColumns">
            <div>
              <h3>Spek dan minus</h3>
              {qcAwal ? visibleHardware.map(([key, value]) => (
                <div className="kv" key={key}><span>{key}</span><strong>{value}</strong></div>
              )) : <p className="bodyText">{unit.entryNotes}</p>}
            </div>
            <div>
              <h3>Catatan Windows awal</h3>
              {qcAwal ? Object.entries(qcAwal.software).map(([key, value]) => (
                <div className="kv" key={key}><span>{key}</span><strong>{value}</strong></div>
              )) : <p className="bodyText">Keputusan siap jual mengikuti QC harian lengkap terbaru.</p>}
            </div>
          </div>
          <div className="infoBox">
            <strong>Catatan input batch</strong>
            <p>{qcAwal?.catatan ?? unit.entryNotes}</p>
          </div>
        </section>

        <aside className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Data Unit</p>
              <h2>Ringkasan</h2>
            </div>
          </div>
          <div className="detailList">
            <div><Cpu size={16} /> {unit.processor}</div>
            <div><HardDrive size={16} /> SSD health {unit.ssdHealth}%</div>
            <div><CalendarClock size={16} /> Tempo {unit.tempo}</div>
          </div>
          {isInternalUser ? <div className="kv"><span>Batch</span><strong>{unit.batch.nomorBatch}</strong></div> : null}
          {isInternalUser ? <div className="kv"><span>Supplier</span><strong>{unit.supplier}</strong></div> : null}
          {isInternalUser ? <div className="kv"><span>Lokasi stok</span><strong>{unit.stockLocation}</strong></div> : null}
          {isInternalUser ? <div className="kv"><span>Seri SSD</span><strong>{unit.ssdSerial}</strong></div> : null}
          <div className="kv"><span>LCD</span><strong>{unit.lcdSize}</strong></div>
          <div className="kv"><span>Resolusi</span><strong>{unit.lcdResolution}</strong></div>
          <div className="kv"><span>Touchscreen</span><strong>{unit.isTouchscreen ? "Ya" : "Tidak"}</strong></div>
          <div className="kv"><span>Battery</span><strong>{unit.batteryHealth}%</strong></div>
          <div className="kv"><span>Harga jual</span><strong>{formatRupiah(unit.hargaJualRekomendasi)}</strong></div>
        </aside>
      </div>

      {isInternalUser && qcAwal ? <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Reminder OS & aplikasi</p>
            <h2>Yang perlu dicek sebelum jual</h2>
          </div>
        </div>
        <div className="reminderGrid">
          {(qcAwal?.reminder ?? []).map((item) => <span key={item}>{item}</span>)}
        </div>
      </section> : null}

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Riwayat harian</p>
            <h2>QC Harian</h2>
          </div>
        </div>
        <div className="noteList">
          {dailyHistory.map((qc) => (
            <div className="note" key={qc.id}>
              <strong>{qc.tanggal} - {qc.masihLolos}</strong>
              <p>{qc.kondisiHariIni}</p>
              <div className="miniMetrics">
                <span>SSD {qc.ssdHealth}%</span>
                <span>Battery {qc.batteryHealth}%</span>
                <span>{qc.screenCondition}</span>
              </div>
              <div className="miniMetrics">
                <span>{qc.windowsVersion}</span>
                <span>Office {qc.officeStatus}</span>
                <span>{qc.partitionCount} partisi</span>
              </div>
              <div className="qcColumns">
                <div>
                  <div className="kv"><span>Seri SSD</span><strong>{qc.ssdSerial}</strong></div>
                  <div className="kv"><span>Keyboard</span><strong>{qc.keyboard ? "OK" : "Perlu cek"}</strong></div>
                  <div className="kv"><span>WiFi</span><strong>{qc.wifi ? "OK" : "Perlu cek"}</strong></div>
                  <div className="kv"><span>USB</span><strong>{qc.usb ? "OK" : "Perlu cek"}</strong></div>
                  <div className="kv"><span>Camera</span><strong>{qc.camera ? "OK" : "Perlu cek"}</strong></div>
                </div>
                <div>
                  <div className="kv"><span>Touchpad</span><strong>{qc.touchpad ? "OK" : "Perlu cek"}</strong></div>
                  <div className="kv"><span>Trackpoint</span><strong>{qc.trackpoint ? "OK" : "Perlu cek"}</strong></div>
                  <div className="kv"><span>Bluetooth</span><strong>{qc.bluetooth ? "OK" : "Perlu cek"}</strong></div>
                  <div className="kv"><span>Speaker/Mic</span><strong>{qc.speaker && qc.mic ? "OK" : "Perlu cek"}</strong></div>
                  <div className="kv"><span>Body/Karet</span><strong>{!qc.bodyBroken && qc.karetBawah ? "OK" : "Perlu cek"}</strong></div>
                </div>
              </div>
              {isInternalUser ? <div className="kv"><span>Kondisi cat internal</span><strong>{qc.paintCondition}</strong></div> : null}
              <small>{qc.catatan} / {qc.checker}</small>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
