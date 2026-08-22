import { Settings } from "lucide-react";
import { requireRole } from "@/lib/session";
import { SettingsPanel } from "./SettingsPanel";

export default async function PengaturanPage() {
  await requireRole(["admin"]);

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Pengaturan</p>
          <h1>Tampilan aplikasi</h1>
          <p className="bodyText">Atur tema untuk komputer ini. Preferensi tersimpan di browser (bukan per akun) — cocok untuk komputer kasir yang dipakai bareng.</p>
        </div>
        <Settings size={30} />
      </div>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Tema</p>
            <h2>Terang, gelap, atau ikuti sistem</h2>
          </div>
        </div>
        <SettingsPanel />
      </section>
    </section>
  );
}
