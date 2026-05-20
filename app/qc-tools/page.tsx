import { Download, MonitorCheck } from "lucide-react";
import { requireRole } from "@/lib/session";
import { QcToolsClient } from "./QcToolsClient";

const downloadTools = [
  {
    name: "CrystalDiskInfo",
    purpose: "Cek SSD health, power-on hours, dan indikasi storage problem.",
    url: "https://crystalmark.info/en/software/crystaldiskinfo/"
  },
  {
    name: "HWiNFO",
    purpose: "Cek spek umum, sensor, battery, suhu, dan perangkat terdeteksi.",
    url: "https://www.hwinfo.com/download/"
  },
  {
    name: "CPU-Z",
    purpose: "Validasi processor, RAM, mainboard, dan detail sistem.",
    url: "https://www.cpuid.com/softwares/cpu-z.html"
  },
  {
    name: "BatteryInfoView",
    purpose: "Cek battery wear, designed capacity, full charge capacity.",
    url: "https://www.nirsoft.net/utils/battery_information_view.html"
  }
];

export default function QcToolsPage() {
  requireRole(["admin", "teknisi", "magang"]);

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">QC Tools</p>
          <h1>Alat bantu pengecekan laptop</h1>
          <p className="bodyText">Pakai tools browser untuk test cepat, lalu catat hasil teknis ke QC awal atau QC harian.</p>
        </div>
        <MonitorCheck size={34} />
      </div>

      <QcToolsClient />

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Windows portable tools</p>
            <h2>Download alat bantu teknisi</h2>
          </div>
          <Download size={22} />
        </div>
        <div className="downloadGrid">
          {downloadTools.map((tool) => (
            <a className="downloadCard" href={tool.url} target="_blank" rel="noreferrer" key={tool.name}>
              <strong>{tool.name}</strong>
              <p>{tool.purpose}</p>
              <span>Buka link resmi</span>
            </a>
          ))}
        </div>
      </section>
    </section>
  );
}
