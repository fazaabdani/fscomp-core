import { Camera, ClipboardCheck, MonitorCog, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/lib/db-data";
import { getUnitsMissingPhotos } from "@/lib/photo-missing-data";
import { getDueDailyQcUnits } from "@/lib/qc-due-data";
import { getCurrentUser } from "@/lib/session";
import { getSoftwareResolutionUnits } from "@/lib/software-resolution-data";
import { CopyWaButton } from "./CopyWaButton";
import { AutoRefresh } from "./AutoRefresh";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (currentUser?.role === "magang") redirect("/qc-harian");

  const [{ stats, problemUnits, aiLogs, connected }, dueDailyQc, missingPhotos, softwareResolution] = await Promise.all([
    getDashboardData(),
    getDueDailyQcUnits(),
    getUnitsMissingPhotos(),
    getSoftwareResolutionUnits()
  ]);
  const publicUrl = process.env.CORE_PUBLIC_URL ?? "https://core.fscomp.id";
  const groupedAiLogs = Array.from(aiLogs.reduce((groups, log) => {
    const logs = groups.get(log.unitNomor) ?? [];
    logs.push(log);
    groups.set(log.unitNomor, logs);
    return groups;
  }, new Map<string, typeof aiLogs>()));
  const dueDailyQcWaText = [
    `*FS Comp Core - Unit Wajib QC Harian*`,
    `Total: ${dueDailyQc.count} unit`,
    `Batas QC: maksimal ${dueDailyQc.dueHours} jam sekali`,
    "",
    ...dueDailyQc.units.map((unit, index) => [
      `${index + 1}. Unit ${unit.nomorUnit} - ${unit.model}`,
      `   Lokasi: ${unit.stockLocation}`,
      `   Spek: ${unit.processor} / ${unit.ram} / ${unit.ssd}`,
      `   Last QC: ${unit.lastQcAt}${unit.qcAgeHours === null ? "" : ` (${unit.qcAgeHours} jam lalu)`}`,
      ...(unit.penyelesaian.length > 0 ? [`   Perlu diselesaikan: ${unit.penyelesaian.join(" | ")}`] : []),
      `   Link QC: ${publicUrl}/qc-harian?unit=${unit.id}`,
      `   Detail: ${publicUrl}/unit/${unit.id}`
    ].join("\n")),
    "",
    "Mohon dicek hari ini."
  ].join("\n");
  const missingPhotoWaText = [
    `*FS Comp Core - Unit Belum Ada Foto*`,
    `Total: ${missingPhotos.count} unit`,
    "",
    ...missingPhotos.units.map((unit, index) => [
      `${index + 1}. Unit ${unit.nomorUnit} - ${unit.model}`,
      `   Lokasi: ${unit.stockLocation}`,
      `   Status: ${unit.statusObservasi}`,
      `   Spek: ${unit.processor} / ${unit.ram} / ${unit.ssd}`,
      `   Detail: ${publicUrl}/unit/${unit.id}`,
      `   Isi foto: ${publicUrl}/unit/${unit.id}/edit`
    ].join("\n")),
    "",
    missingPhotos.count > missingPhotos.units.length ? `Masih ada ${missingPhotos.count - missingPhotos.units.length} unit lain belum tampil di pesan ini.` : "",
    "Mohon difoto dan link fotonya diisi."
  ].filter(Boolean).join("\n");
  const softwareResolutionWaText = [
    `*FS Comp Core - Unit Perlu Diselesaikan Software*`,
    `Total: ${softwareResolution.count} unit`,
    "",
    ...softwareResolution.units.map((unit, index) => [
      `${index + 1}. Unit ${unit.nomorUnit} - ${unit.model}`,
      `   Lokasi: ${unit.stockLocation}`,
      `   Status: ${unit.statusObservasi}`,
      `   Spek: ${unit.processor} / ${unit.ram} / ${unit.ssd}`,
      `   Last QC: ${unit.lastQcAt}`,
      `   Perlu diselesaikan: ${unit.items.join(" | ")}`,
      `   Isi ulang QC: ${publicUrl}/qc-harian?unit=${unit.id}`,
      `   Detail: ${publicUrl}/unit/${unit.id}`
    ].join("\n")),
    "",
    softwareResolution.count > softwareResolution.units.length ? `Masih ada ${softwareResolution.count - softwareResolution.units.length} unit lain belum tampil di pesan ini.` : "",
    "Mohon diselesaikan software-nya lalu isi ulang QC harian."
  ].filter(Boolean).join("\n");

  return (
    <section className="pageStack">
      <AutoRefresh />
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

      <section className="panel dangerPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Wajib QC Harian</p>
            <h2>{dueDailyQc.count} unit perlu dicek</h2>
          </div>
          <div className="buttonCluster">
            <CopyWaButton text={dueDailyQcWaText} disabled={dueDailyQc.units.length === 0} />
            <Link className="secondaryButton" href="/qc-harian">Input QC</Link>
          </div>
        </div>
        <div className="infoBox">
          Unit wajib QC harian maksimal {dueDailyQc.dueHours} jam sekali. Unit tetap tampil di kasir dan katalog, bagian ini hanya alarm operasional.
        </div>
        <div className="listStack">
          {dueDailyQc.units.length === 0 ? <div className="emptyState">Semua unit aktif masih dalam jadwal QC harian.</div> : dueDailyQc.units.map((unit) => (
            <Link href={`/qc-harian?unit=${unit.id}`} className="unitListItem" key={unit.id}>
              <div>
                <strong>Unit {unit.nomorUnit} - {unit.model}</strong>
                <small>{unit.stockLocation} / Last QC: {unit.lastQcAt}{unit.qcAgeHours === null ? "" : ` / ${unit.qcAgeHours} jam lalu`}</small>
                <small>{unit.processor} / {unit.ram} / {unit.ssd}</small>
                {unit.penyelesaian.length > 0 ? <small>Perlu diselesaikan: {unit.penyelesaian[0]}</small> : null}
              </div>
              <span className="statusPill yellow">Wajib QC</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Foto katalog</p>
            <h2>{missingPhotos.count} unit belum ada foto</h2>
          </div>
          <div className="buttonCluster">
            <CopyWaButton text={missingPhotoWaText} disabled={missingPhotos.units.length === 0} />
            <Link className="secondaryButton" href="/batch-psi?sort=foto">Lihat Unit</Link>
          </div>
        </div>
        <div className="listStack">
          {missingPhotos.units.length === 0 ? <div className="emptyState">Semua unit aktif sudah punya foto katalog.</div> : missingPhotos.units.slice(0, 8).map((unit) => (
            <Link href={`/unit/${unit.id}/edit`} className="unitListItem" key={unit.id}>
              <div>
                <strong>Unit {unit.nomorUnit} - {unit.model}</strong>
                <small>{unit.stockLocation} / {unit.statusObservasi}</small>
                <small>{unit.processor} / {unit.ram} / {unit.ssd}</small>
              </div>
              <span className="statusPill yellow"><Camera size={14} /> Perlu foto</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel dangerPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Penyelesaian software</p>
            <h2>{softwareResolution.count} unit perlu dibereskan</h2>
          </div>
          <div className="buttonCluster">
            <CopyWaButton text={softwareResolutionWaText} disabled={softwareResolution.units.length === 0} />
            <Link className="secondaryButton" href="/qc-harian">Input QC</Link>
          </div>
        </div>
        <div className="infoBox">
          Ini khusus reminder software seperti OS, driver, jam, aplikasi, partisi, dan Office belum install. Office bajakan tidak masuk daftar perlu dibereskan.
        </div>
        <div className="listStack">
          {softwareResolution.units.length === 0 ? <div className="emptyState">Belum ada unit aktif yang punya PR software.</div> : softwareResolution.units.slice(0, 8).map((unit) => (
            <Link href={`/qc-harian?unit=${unit.id}`} className="unitListItem" key={unit.id}>
              <div>
                <strong>Unit {unit.nomorUnit} - {unit.model}</strong>
                <small>{unit.stockLocation} / Last QC: {unit.lastQcAt}</small>
                <small>{unit.items.slice(0, 3).join(" | ")}</small>
              </div>
              <span className="statusPill yellow">Perlu software</span>
            </Link>
          ))}
        </div>
      </section>

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
            {groupedAiLogs.length === 0 ? <div className="emptyState">Belum ada AI log dari database.</div> : groupedAiLogs.map(([unitNomor, logs]) => (
              <div className="aiLog" key={unitNomor}>
                <strong>Unit {unitNomor}</strong>
                {logs.map((log) => <p key={log.id}>{log.rekomendasi}</p>)}
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
