import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Cpu, HardDrive, QrCode, ShieldCheck } from "lucide-react";
import { formatRupiah, getBatch, getDailyQcByUnit, getUnit } from "@/lib/api";
import { statusTone } from "@/lib/constants";

export default function UnitDetailPage({ params }: { params: { id: string } }) {
  const unit = getUnit(params.id);
  if (!unit) notFound();

  const batch = getBatch(unit.batchId);
  const dailyHistory = getDailyQcByUnit(unit.id);

  return (
    <section className="pageStack">
      <Link className="backLink" href="/"><ArrowLeft size={16} /> Kembali</Link>

      <div className="unitHero">
        <div>
          <p className="eyebrow">Unit {unit.nomorUnit}</p>
          <h1>{unit.model}</h1>
          <p className="heroCopy">{unit.processor} / {unit.ram} / {unit.ssd}</p>
        </div>
        <div className="unitHeroActions">
          <span className={`statusPill ${statusTone[unit.statusObservasi]}`}>{unit.statusObservasi}</span>
          <Link className="primaryButton" href={`/label?unit=${unit.id}`}><QrCode size={17} /> Generate Label</Link>
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
              {Object.entries(unit.qcAwal.hardware).map(([key, value]) => (
                <div className="kv" key={key}><span>{key}</span><strong>{value}</strong></div>
              ))}
            </div>
            <div>
              <h3>Software</h3>
              {Object.entries(unit.qcAwal.software).map(([key, value]) => (
                <div className="kv" key={key}><span>{key}</span><strong>{value}</strong></div>
              ))}
            </div>
          </div>
          <div className="infoBox">
            <strong>Catatan QC</strong>
            <p>{unit.qcAwal.catatan}</p>
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
          <div className="kv"><span>Batch</span><strong>{batch?.nomorBatch}</strong></div>
          <div className="kv"><span>Supplier</span><strong>{unit.supplier}</strong></div>
          <div className="kv"><span>Seri SSD</span><strong>{unit.ssdSerial}</strong></div>
          <div className="kv"><span>LCD</span><strong>{unit.lcdSize}</strong></div>
          <div className="kv"><span>Resolusi</span><strong>{unit.lcdResolution}</strong></div>
          <div className="kv"><span>Touchscreen</span><strong>{unit.isTouchscreen ? "Ya" : "Tidak"}</strong></div>
          <div className="kv"><span>Battery</span><strong>{unit.batteryHealth}%</strong></div>
          <div className="kv"><span>Harga jual</span><strong>{formatRupiah(unit.hargaJualRekomendasi)}</strong></div>
        </aside>
      </div>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Reminder OS & aplikasi</p>
            <h2>Yang perlu dicek sebelum jual</h2>
          </div>
        </div>
        <div className="reminderGrid">
          {unit.qcAwal.reminder.map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>

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
