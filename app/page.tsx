import { AlertTriangle, Boxes, ClipboardCheck, QrCode, ScanLine, Sparkles } from "lucide-react";
import Link from "next/link";
import { aiLogs, batches, dailyQcs, formatRupiah, getCatalogReadyUnits, getProblemUnits, units } from "@/lib/api";
import { statusTone } from "@/lib/constants";

const stats = [
  { label: "Unit aktif", value: units.length, icon: Boxes },
  { label: "Siap katalog", value: getCatalogReadyUnits().length, icon: ClipboardCheck },
  { label: "Perlu perhatian", value: getProblemUnits().length, icon: AlertTriangle },
  { label: "QC harian", value: dailyQcs.length, icon: ScanLine }
];

export default function DashboardPage() {
  const problemUnits = getProblemUnits();

  return (
    <section className="pageStack">
      <div className="heroBand">
        <div>
          <p className="eyebrow">Operasional hari ini</p>
          <h1>Kontrol unit FS Comp dari PSI sampai siap jual.</h1>
          <p className="heroCopy">
            Pantau QC awal, QC harian, status batch, reminder OS/aplikasi, dan rekomendasi AI sebelum unit masuk katalog.
          </p>
        </div>
        <div className="heroActions">
          <Link className="primaryButton" href="/qc-harian">Input QC Harian</Link>
          <Link className="secondaryButton" href="/label">Cetak Label QR</Link>
        </div>
      </div>

      <div className="statsGrid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className="metric" key={stat.label}>
              <Icon size={20} />
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          );
        })}
      </div>

      <div className="contentGrid">
        <section className="panel wide">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Unit problem terbaru</p>
              <h2>Butuh keputusan sebelum katalog</h2>
            </div>
            <AlertTriangle size={22} />
          </div>
          <div className="tableLike">
            {problemUnits.map((unit) => (
              <Link className="unitRow" href={`/unit/${unit.id}`} key={unit.id}>
                <span className="unitNumber">{unit.nomorUnit}</span>
                <span>
                  <strong>{unit.model}</strong>
                  <small>{unit.processor} / {unit.ram} / {unit.ssd}</small>
                </span>
                <span className={`statusPill ${statusTone[unit.statusObservasi]}`}>{unit.statusObservasi}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Chief Assistant</p>
              <h2>AI Reporting</h2>
            </div>
            <Sparkles size={22} />
          </div>
          <div className="noteList">
            {aiLogs.map((log) => {
              const unit = units.find((item) => item.id === log.unitId);
              return (
                <div className="note" key={log.id}>
                  <strong>Unit {unit?.nomorUnit}</strong>
                  <p>{log.rekomendasi}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Batch PSI</p>
            <h2>Status pembayaran dan tempo</h2>
          </div>
          <Link className="iconButton" href="/batch-psi" title="Buka batch PSI"><QrCode size={18} /></Link>
        </div>
        <div className="batchGrid">
          {batches.map((batch) => (
            <article className="batchCard" key={batch.id}>
              <span className="batchCode">{batch.nomorBatch}</span>
              <h3>{batch.supplier}</h3>
              <p>{batch.catatan}</p>
              <div className="split">
                <span>Tempo {batch.tanggalTempo}</span>
                <strong>{batch.statusPembayaran}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Siap katalog.fscomp.id</p>
            <h2>Unit verified</h2>
          </div>
        </div>
        <div className="catalogGrid">
          {getCatalogReadyUnits().map((unit) => (
            <Link className="catalogItem" href={`/unit/${unit.id}`} key={unit.id}>
              <span>Unit {unit.nomorUnit}</span>
              <strong>{unit.model}</strong>
              <small>{unit.processor} / {unit.ram} / {unit.ssd}</small>
              <b>{formatRupiah(unit.hargaJualRekomendasi)}</b>
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}
