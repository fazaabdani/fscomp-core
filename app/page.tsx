import { AlertTriangle, Boxes, ClipboardCheck, QrCode, ScanLine, Sparkles } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/api";
import { statusTone } from "@/lib/constants";
import { getDashboardData } from "@/lib/db-data";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();
  const currentUser = getCurrentUser();
  const stats = [
    { label: "Unit aktif", value: dashboard.stats.unitAktif, icon: Boxes, tone: "blue" },
    { label: "Siap katalog", value: dashboard.stats.siapKatalog, icon: ClipboardCheck, tone: "green" },
    { label: "Perlu perhatian", value: dashboard.stats.perluPerhatian, icon: AlertTriangle, tone: "red" },
    { label: "QC harian", value: dashboard.stats.qcHarian, icon: ScanLine, tone: "cyan" }
  ];

  return (
    <section className="pageStack">
      <div className="heroBand techHero">
        <div>
          <p className="eyebrow">Operasional hari ini</p>
          <h1>Kontrol unit FS Comp dari PSI sampai siap jual.</h1>
          <p className="heroCopy">
            Pantau input batch, QC harian lengkap, status batch, reminder OS/aplikasi, dan rekomendasi AI sebelum unit masuk katalog.
          </p>
        </div>
        <div className="heroActions">
          <Link className="primaryButton" href="/qc-harian">Input QC Harian</Link>
          {currentUser?.role === "admin" ? <Link className="secondaryButton" href="/sales">Kasir Penjualan</Link> : null}
          <Link className="secondaryButton" href="/label">Cetak Label QR</Link>
        </div>
      </div>

      {!dashboard.connected ? (
        <div className="infoBox dangerInfo">
          Database belum bisa dibaca. Cek `DATABASE_URL`, status PostgreSQL, dan redeploy app.
        </div>
      ) : null}

      <div className="statsGrid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className={`metric metric-${stat.tone}`} key={stat.label}>
              <Icon size={20} />
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          );
        })}
      </div>

      <div className="contentGrid">
        <section className="panel wide dashboardPanel attentionPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Unit problem terbaru</p>
              <h2>Butuh keputusan sebelum katalog</h2>
            </div>
            <AlertTriangle size={22} />
          </div>
          <div className="tableLike">
            {dashboard.problemUnits.length === 0 ? (
              <div className="emptyState">Belum ada unit RECHECK atau CANDIDATE RETUR dari data Batch PSI.</div>
            ) : dashboard.problemUnits.map((unit) => (
              <Link className="unitRow" href={`/unit/${unit.id}`} key={unit.id}>
                <span className="unitNumber">{unit.nomorUnit}</span>
                <span>
                  <strong>{unit.model}</strong>
                  <small>{unit.processor} / {unit.ram} / {unit.ssd}</small>
                </span>
                <span className={`statusPill ${statusTone[unit.statusObservasi as keyof typeof statusTone] ?? "yellow"}`}>{unit.statusObservasi}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel dashboardPanel assistantPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Chief Assistant</p>
              <h2>AI Reporting</h2>
            </div>
            <Sparkles size={22} />
          </div>
          <div className="noteList">
            {dashboard.aiLogs.length === 0 ? (
              <div className="emptyState">Belum ada AI log dari database.</div>
            ) : dashboard.aiLogs.map((log) => (
                <div className="note" key={log.id}>
                  <strong>Unit {log.unitNomor}</strong>
                  <p>{log.rekomendasi}</p>
                </div>
              ))}
          </div>
        </section>
      </div>

      <section className="panel dashboardPanel batchPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Batch PSI</p>
            <h2>Status pembayaran dan tempo</h2>
          </div>
          <Link className="iconButton" href="/batch-psi" title="Buka batch PSI"><QrCode size={18} /></Link>
        </div>
        <div className="batchGrid">
          {dashboard.batches.length === 0 ? (
            <div className="emptyState">Belum ada Batch PSI di database. Tambahkan batch dulu dari menu Batch PSI.</div>
          ) : dashboard.batches.map((batch) => (
            <article className="batchCard" key={batch.id}>
              <span className="batchCode">{batch.nomorBatch}</span>
              <h3>{batch.supplier}</h3>
              <p>{batch.catatan}</p>
              <div className="split">
                <span>{batch.jumlahUnit} unit / Tempo {batch.tanggalTempo}</span>
                <strong>{batch.statusPembayaran}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel dashboardPanel catalogPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Siap katalog.fscomp.id</p>
            <h2>Unit verified</h2>
          </div>
        </div>
        <div className="catalogGrid">
          {dashboard.catalogReadyUnits.length === 0 ? (
            <div className="emptyState">Belum ada unit VERIFIED dari database.</div>
          ) : dashboard.catalogReadyUnits.map((unit) => (
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
