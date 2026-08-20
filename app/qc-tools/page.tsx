import { FolderOpen, MonitorCheck } from "lucide-react";
import { requireRole } from "@/lib/session";
import { LocalShareButton } from "./LocalShareButton";
import { QcToolsClient } from "./QcToolsClient";

const localShares = [
  {
    name: "FS APPS",
    purpose: "Installer aplikasi umum untuk persiapan unit.",
    unc: "\\\\192.168.18.15\\FS-APPS",
    url: "file://192.168.18.15/FS-APPS"
  },
  {
    name: "FS DRIVER",
    purpose: "Driver laptop dan perangkat pendukung.",
    unc: "\\\\192.168.18.15\\FS-DRIVER",
    url: "file://192.168.18.15/FS-DRIVER"
  },
  {
    name: "FS TOOLS",
    purpose: "Tools QC lokal seperti cek SSD, baterai, sensor, dan spek.",
    unc: "\\\\192.168.18.15\\FS-TOOLS",
    url: "file://192.168.18.15/FS-TOOLS"
  },
  {
    name: "FS ISO",
    purpose: "File ISO Windows dan kebutuhan instalasi OS.",
    unc: "\\\\192.168.18.15\\FS-ISO",
    url: "file://192.168.18.15/FS-ISO"
  }
];

export default async function QcToolsPage() {
  await requireRole(["admin", "teknisi", "sales", "magang"]);

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
            <p className="eyebrow">Folder lokal toko</p>
            <h2>Shortcut tools di server 192.168.18.15</h2>
          </div>
          <FolderOpen size={22} />
        </div>
        <div className="infoBox noTopMargin">
          Klik tombol akan mencoba buka File Explorer dan menyalin alamat UNC. Jika browser tetap memblokir, paste alamat yang tersalin ke File Explorer.
        </div>
        <div className="downloadGrid">
          {localShares.map((tool) => (
            <div className="downloadCard" key={tool.name}>
              <strong>{tool.name}</strong>
              <p>{tool.purpose}</p>
              <code>{tool.unc}</code>
              <LocalShareButton fileUrl={tool.url} unc={tool.unc} />
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
