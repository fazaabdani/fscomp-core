import { Download, MonitorCheck } from "lucide-react";
import { requireRole } from "@/lib/session";
import { QcToolsClient } from "./QcToolsClient";

const downloadTools = [
  {
    name: "CrystalDiskInfo",
    purpose: "Cek SSD health, power-on hours, dan indikasi storage problem.",
    url: "/tools/CrystalDiskInfo.zip"
  },
  {
    name: "HWiNFO",
    purpose: "Cek spek umum, sensor, battery, suhu, dan perangkat terdeteksi.",
    url: "/tools/HWiNFO.zip"
  },
  {
    name: "CPU-Z",
    purpose: "Validasi processor, RAM, mainboard, dan detail sistem.",
    url: "/tools/CPU-Z.zip"
  },
  {
    name: "BatteryInfoView",
    purpose: "Cek battery wear, designed capacity, full charge capacity.",
    url: "/tools/BatteryInfoView.zip"
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
          <p className="bodyText">Pakai tools browser untuk test cepat, lalu catat hasil teknis ke QC harian lengkap.</p>
        </div>
        <MonitorCheck size={34} />
      </div>

      <QcToolsClient />

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Windows portable tools</p>
            <h2>Tools lokal dari sistem Core</h2>
          </div>
          <Download size={22} />
        </div>
        <div className="infoBox noTopMargin">
          Upload file portable ke folder <strong>public/tools</strong> dengan nama sesuai kartu di bawah. Setelah deploy, teknisi tinggal download dari Core tanpa cari ulang ke website resmi.
        </div>
        <div className="downloadGrid">
          {downloadTools.map((tool) => (
            <a className="downloadCard" href={tool.url} download key={tool.name}>
              <strong>{tool.name}</strong>
              <p>{tool.purpose}</p>
              <span>Download dari Core</span>
            </a>
          ))}
        </div>
      </section>
    </section>
  );
}
