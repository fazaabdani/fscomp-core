import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Cpu, HardDrive, QrCode, ShieldCheck } from "lucide-react";
import { formatRupiah } from "@/lib/api";
import { getUnitForDetail } from "@/lib/db-data";
import { statusTone } from "@/lib/constants";
import { getCurrentUser } from "@/lib/session";

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
              <p className="eyebrow">QC Awal</p>
              <h2>Hardware dan software</h2>
            </div>
            <ShieldCheck size={22} />
          </div>
          <div className="qcColumns">
            <div>
              <h3>Hardware</h3>
              {qcAwal ? visibleHardware.map(([key, value]) => (
                <div className="kv" key={key}><span>{key}</span><strong>{value}</strong></div>
              )) : <p className="bodyText">QC awal belum diisi.</p>}
            </div>
            <div>
              <h3>Software</h3>
              {qcAwal ? Object.entries(qcAwal.software).map(([key, value]) => (
                <div className="kv" key={key}><span>{key}</span><strong>{value}</strong></div>
              )) : <p className="bodyText">QC software belum diisi.</p>}
            </div>
          </div>
          <div className="infoBox">
            <strong>Catatan QC</strong>
            <p>{qcAwal?.catatan ?? "-"}</p>
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
          {isInternalUser ? <div className="kv"><span>Seri SSD</span><strong>{unit.ssdSerial}</strong></div> : null}
          <div className="kv"><span>LCD</span><strong>{unit.lcdSize}</strong></div>
          <div className="kv"><span>Resolusi</span><strong>{unit.lcdResolution}</strong></div>
          <div className="kv"><span>Touchscreen</span><strong>{unit.isTouchscreen ? "Ya" : "Tidak"}</strong></div>
          <div className="kv"><span>Battery</span><strong>{unit.batteryHealth}%</strong></div>
          <div className="kv"><span>Harga jual</span><strong>{formatRupiah(unit.hargaJualRekomendasi)}</strong></div>
        </aside>
      </div>

      {isInternalUser ? <section className="panel">
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
              </div>
              <small>{qc.catatan} / {qc.checker}</small>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
