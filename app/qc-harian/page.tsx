import { BatteryCharging, Bluetooth, CheckCircle2, HardDrive, Keyboard, Monitor, Wifi } from "lucide-react";
import Link from "next/link";
import { dailyQcs, units } from "@/lib/api";

const checklist = [
  { label: "Nyala normal", icon: CheckCircle2 },
  { label: "Booting", icon: Monitor },
  { label: "Keyboard", icon: Keyboard },
  { label: "SSD", icon: HardDrive },
  { label: "Battery", icon: BatteryCharging },
  { label: "WiFi", icon: Wifi },
  { label: "Bluetooth", icon: Bluetooth }
];

export default function QcHarianPage() {
  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">QC Harian</p>
          <h1>Checklist singkat unit wajib cek hari ini</h1>
        </div>
      </div>

      <div className="qcLayout">
        <form className="panel qcForm">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Input cepat</p>
              <h2>Catat kondisi hari ini</h2>
            </div>
          </div>
          <label>
            Unit
            <select defaultValue="unit-001">
              {units.map((unit) => (
                <option value={unit.id} key={unit.id}>Unit {unit.nomorUnit} - {unit.model}</option>
              ))}
            </select>
          </label>
          <div className="checkGrid">
            {checklist.map((item) => {
              const Icon = item.icon;
              return (
                <label className="checkTile" key={item.label}>
                  <input type="checkbox" defaultChecked />
                  <Icon size={18} />
                  <span>{item.label}</span>
                </label>
              );
            })}
          </div>
          <div className="numberGrid">
            <label>
              SSD Health (%)
              <input type="number" min="0" max="100" defaultValue="95" />
            </label>
            <label>
              Battery Health (%)
              <input type="number" min="0" max="100" defaultValue="80" />
            </label>
          </div>
          <label>
            Status
            <select defaultValue="Lolos">
              <option>Lolos</option>
              <option>Lolos dengan catatan</option>
              <option>Tidak Lolos</option>
            </select>
          </label>
          <label>
            Catatan harian
            <textarea placeholder="Contoh: booting normal, battery turun 6 persen dalam 20 menit." />
          </label>
          <button className="primaryButton" type="button">Simpan QC Harian</button>
        </form>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Riwayat terbaru</p>
              <h2>Hasil QC harian</h2>
            </div>
          </div>
          <div className="noteList">
            {dailyQcs.map((qc) => {
              const unit = units.find((item) => item.id === qc.unitId);
              return (
                <Link className="note linkNote" href={`/unit/${qc.unitId}`} key={qc.id}>
                  <strong>Unit {unit?.nomorUnit} - {qc.masihLolos}</strong>
                  <p>{qc.kondisiHariIni}</p>
                  <div className="miniMetrics">
                    <span>SSD {qc.ssdHealth}%</span>
                    <span>Battery {qc.batteryHealth}%</span>
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
