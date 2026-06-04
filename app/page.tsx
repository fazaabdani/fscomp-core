import { ClipboardCheck, MonitorCog, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/lib/db-data";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const currentUser = getCurrentUser();
  if (currentUser?.role === "magang") redirect("/qc-harian");

  const { stats, problemUnits, aiLogs, connected } = await getDashboardData();

  return (
    <section className="pageStack">
      <div className="heroPanel">
        <div>
          <p className="eyebrow">Operasional hari ini</p>
          <h1>Kontrol unit FS Comp dari PSI sampai siap jual.</h1>
          <p>Pantau input batch, QC harian lengkap, status batch, reminder OS/aplikasi, dan rekomendasi AI sebelum unit masuk katalog.</p>
        </div>
        <div className="heroActions">
          <Link className="primaryButton" href="/qc-harian">Input QC Harian</Link>
          {currentUser ? <Link className="secondaryButton" href="/sales">Kasir Penjualan</Link> : null}
          <Link className="secondaryButton" href="/label">Cetak Label QR</Link>
        </div>
      </div>

      {!connected ? (
        <div className="infoBox dangerInfo">
          Database belum bisa dibaca. Cek <strong>DATABASE_URL</strong>, status PostgreSQL, dan redeploy app.
        </div>
      ) : null}

      <div className="statsGrid">
        <article className="statCard"><MonitorCog size={19} /><span>Unit aktif</span><strong>{stats.unitAktif}</strong></article>
        <article className="statCard"><ClipboardCheck size={19} /><span>Siap katalog</span><strong>{stats.siapKatalog}</strong></article>
        <article className="statCard"><TriangleAlert size={19} /><span>Perlu perhatian</span><strong>{stats.perluPerhatian}</strong></article>
        <article className="statCard"><MonitorCog size={19} /><span>QC harian</span><strong>{stats.qcHarian}</strong></article>
      </div>

      <div className="twoColumn">
        <section className="panel dangerPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Unit problem terbaru</p>
              <h2>Butuh keputusan sebelum katalog</h2>
            </div>
            <TriangleAlert size={22} />
          </div>
          <div className="listStack">
            {problemUnits.length === 0 ? <div className="emptyState">Belum ada unit RECHECK atau CANDIDATE_RETUR dari data Batch PSI.</div> : problemUnits.map((unit) => (
              <Link href={`/unit/${unit.id}`} className="unitListItem" key={unit.id}>
                <div>
                  <strong>Unit {unit.nomorUnit} - {unit.model}</strong>
                  <small>{unit.processor} / {unit.ram} / {unit.ssd}</small>
                </div>
                <span className="statusPill yellow">{unit.statusObservasi}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel aiPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Chief assistant</p>
              <h2>AI Reporting</h2>
            </div>
            <Sparkles size={22} />
          </div>
          <div className="listStack">
            {aiLogs.length === 0 ? <div className="emptyState">Belum ada AI log dari database.</div> : aiLogs.map((log) => (
              <div className="aiLog" key={log.id}>
                <strong>Unit {log.unit.nomorUnit} - {log.unit.model}</strong>
                <p>{log.rekomendasi}</p>
                <small>{log.status} / {new Date(log.tanggal).toLocaleString("id-ID")}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
