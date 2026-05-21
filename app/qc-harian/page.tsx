import { Bluetooth, CheckCircle2, HardDrive, Keyboard, Monitor, Volume2, Wifi } from "lucide-react";
import Link from "next/link";
import { getQcHarianPageData } from "@/lib/db-data";
import { createDailyQcAction } from "./actions";

const checklist = [
  { label: "Nyala normal", name: "nyalaNormal", icon: CheckCircle2 },
  { label: "Booting", name: "booting", icon: Monitor },
  { label: "Keyboard", name: "keyboard", icon: Keyboard },
  { label: "SSD", name: "ssd", icon: HardDrive },
  { label: "Speaker", name: "speaker", icon: Volume2 },
  { label: "WiFi", name: "wifi", icon: Wifi },
  { label: "Bluetooth", name: "bluetooth", icon: Bluetooth }
];

export default async function QcHarianPage({ searchParams }: { searchParams?: { saved?: string; error?: string } }) {
  const { units, dailyQcs } = await getQcHarianPageData();
  const firstUnit = units[0];

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">QC Harian</p>
          <h1>Checklist singkat unit wajib cek hari ini</h1>
        </div>
      </div>

      <div className="qcLayout">
        <form className="panel qcForm" action={createDailyQcAction}>
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Input cepat</p>
              <h2>Catat kondisi hari ini</h2>
            </div>
          </div>
          <label>
            Unit
            <select name="unitId" defaultValue={firstUnit?.id} required>
              {units.map((unit) => (
                <option value={unit.id} key={unit.id}>Unit {unit.nomorUnit} - {unit.model}</option>
              ))}
            </select>
          </label>
          <label>
            Nama checker
            <input name="checkerName" placeholder="Contoh: Raka PKL" required />
          </label>
          {searchParams?.saved ? <div className="successBox">QC harian berhasil disimpan.</div> : null}
          {searchParams?.error ? <div className="infoBox dangerInfo">QC gagal disimpan: {searchParams.error}</div> : null}
          <div className="checkGrid">
            {checklist.map((item) => {
              const Icon = item.icon;
              return (
                <label className="checkTile" key={item.label}>
                  <input name={item.name} type="checkbox" defaultChecked />
                  <Icon size={18} />
                  <span>{item.label}</span>
                </label>
              );
            })}
          </div>
          <div className="numberGrid">
            <label>
              SSD Health (%)
              <input name="ssdHealth" type="number" min="0" max="100" defaultValue={firstUnit?.ssdHealth ?? 95} />
            </label>
            <label>
              Battery Health (%)
              <input name="batteryHealth" type="number" min="0" max="100" defaultValue={firstUnit?.batteryHealth ?? 80} />
            </label>
          </div>
          <label>
            Seri Windows hari ini
            <select name="windowsVersion" defaultValue="Windows 11">
              <option>Windows 11</option>
              <option>Windows 10</option>
              <option>Belum install OS</option>
              <option>OS bermasalah</option>
            </select>
          </label>
          <div className="infoBox compactInfo">
            Status otomatis: battery di bawah 70% atau SSD health di bawah 80% akan masuk <strong>Tidak Lolos</strong>. Unit Gen 8 ke atas baru siap jual kalau QC harian terakhir sudah Windows 11.
          </div>
          <label>
            Catatan harian
            <textarea name="catatan" placeholder="Contoh: booting normal, battery turun 6 persen dalam 20 menit." />
          </label>
          <button className="primaryButton" type="submit" disabled={units.length === 0}>Simpan QC Harian</button>
        </form>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Riwayat terbaru</p>
              <h2>Hasil QC harian</h2>
            </div>
          </div>
          <div className="noteList">
            {dailyQcs.length === 0 ? (
              <div className="emptyState">Belum ada hasil QC harian. Simpan QC pertama dari form di kiri.</div>
            ) : dailyQcs.map((qc) => {
              return (
                <Link className="note linkNote" href={`/unit/${qc.unitId}`} key={qc.id}>
                  <strong>Unit {qc.unit?.nomorUnit} - {qc.masihLolos}</strong>
                  <small>{qc.unit?.model}</small>
                  <p>{qc.kondisiHariIni}</p>
                  <div className="miniMetrics">
                    <span>SSD {qc.ssdHealth}%</span>
                    <span>Battery {qc.batteryHealth}%</span>
                    <span>{qc.windowsVersion}</span>
                  </div>
                  <small>{qc.tanggal} oleh {qc.checker}</small>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </section>
  );
}
