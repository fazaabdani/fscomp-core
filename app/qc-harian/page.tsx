import { Bluetooth, Camera, CheckCircle2, Keyboard, Mic, Usb, Volume2, Wifi } from "lucide-react";
import Link from "next/link";
import { getQcHarianPageData } from "@/lib/db-data";
import { createDailyQcAction } from "./actions";

const checklist = [
  { label: "Keyboard", name: "keyboard", icon: Keyboard },
  { label: "WiFi", name: "wifi", icon: Wifi },
  { label: "USB", name: "usb", icon: Usb },
  { label: "Camera", name: "camera", icon: Camera },
  { label: "Touchpad", name: "touchpad", icon: CheckCircle2 },
  { label: "Trackpoint", name: "trackpoint", icon: CheckCircle2 },
  { label: "Bluetooth", name: "bluetooth", icon: Bluetooth },
  { label: "Speaker", name: "speaker", icon: Volume2 },
  { label: "Mic", name: "mic", icon: Mic },
  { label: "Karet bawah", name: "karetBawah", icon: CheckCircle2 }
];

export default async function QcHarianPage({ searchParams }: { searchParams?: { saved?: string; error?: string; unit?: string } }) {
  const { units, dailyQcs } = await getQcHarianPageData();
  const selectedUnit = units.find((unit) => unit.id === searchParams?.unit) ?? units[0];

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">QC Harian</p>
          <h1>Checklist lengkap unit wajib cek hari ini</h1>
        </div>
      </div>

      <div className="qcLayout">
        <form className="panel qcForm qcCompactForm" action={createDailyQcAction}>
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Input cepat</p>
              <h2>Catat QC lengkap hari ini</h2>
            </div>
          </div>
          <label>
            Unit
            <select name="unitId" defaultValue={selectedUnit?.id} required>
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
          <div className="numberGrid">
            <label>
              SSD Health (%)
              <input name="ssdHealth" type="number" min="0" max="100" defaultValue={selectedUnit?.ssdHealth ?? 95} />
            </label>
            <label>
              Seri SSD
              <input name="ssdSerial" defaultValue={selectedUnit?.ssdSerial ?? ""} placeholder="Contoh: Samsung PM981 / SN..." />
            </label>
          </div>
          <div className="numberGrid">
            <label>
              Battery Health (%)
              <input name="batteryHealth" type="number" min="0" max="100" defaultValue={selectedUnit?.batteryHealth ?? 80} />
            </label>
            <label>
              Kondisi layar
              <select name="screenCondition" defaultValue="Normal">
                <option>Normal</option>
                <option>White spot</option>
                <option>Garis</option>
                <option>Pecah</option>
              </select>
            </label>
          </div>
          <label>
            Lokasi stok
            <select name="stockLocation" defaultValue={selectedUnit?.stockLocation ?? "WIRADESA"}>
              <option value="WIRADESA">Wiradesa utama</option>
              <option value="KAJEN">Kajen secondary</option>
            </select>
          </label>
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
              Body broken
              <select name="bodyBroken" defaultValue="Tidak">
                <option>Tidak</option>
                <option>Ya</option>
              </select>
            </label>
            <label>
              Kondisi cat
              <select name="paintCondition" defaultValue="Normal">
                <option>Normal</option>
                <option>Baret halus</option>
                <option>Repaint</option>
                <option>Repaint parah</option>
                <option>Kelupas</option>
              </select>
            </label>
          </div>
          <div className="numberGrid">
            <label>
              Windows
              <select name="windowsVersion" defaultValue="Windows 11">
                <option>Windows 11</option>
                <option>Windows 10</option>
                <option>Belum install OS</option>
                <option>OS bermasalah</option>
              </select>
            </label>
            <label>
              Driver
              <select name="driverStatus" defaultValue="OK">
                <option>OK</option>
                <option>Perlu update</option>
                <option>Bermasalah</option>
              </select>
            </label>
          </div>
          <div className="numberGrid">
            <label>
              Jam
              <select name="clockStatus" defaultValue="Sesuai">
                <option>Sesuai</option>
                <option>Perlu setting</option>
                <option>Sering reset</option>
              </select>
            </label>
            <label>
              Aplikasi
              <select name="appStatus" defaultValue="Lengkap">
                <option>Lengkap</option>
                <option>Belum lengkap</option>
                <option>Perlu update</option>
              </select>
            </label>
          </div>
          <div className="numberGrid">
            <label>
              Status Office
              <select name="officeStatus" defaultValue="Original / resmi">
                <option>Original / resmi</option>
                <option>Belum install</option>
                <option>Bajakan</option>
                <option>Tidak dicek</option>
              </select>
            </label>
            <label>
              Partisi
              <select name="partitionCount" defaultValue="2">
                <option value="2">Jadi 2 partisi</option>
                <option value="1">Masih 1 partisi</option>
              </select>
            </label>
          </div>
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
                    <span>{qc.screenCondition}</span>
                  </div>
                  <div className="miniMetrics">
                    <span>{qc.windowsVersion}</span>
                    <span>Office {qc.officeStatus}</span>
                    <span>{qc.partitionCount} partisi</span>
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
