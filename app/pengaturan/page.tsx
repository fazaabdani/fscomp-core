import { Settings } from "lucide-react";
import { getAppSettings } from "@/lib/app-settings";
import { requireRole } from "@/lib/session";
import { FlashNotice } from "../FlashNotice";
import { SettingsPanel } from "./SettingsPanel";

export default async function PengaturanPage({ searchParams }: { searchParams?: { success?: string } }) {
  await requireRole(["admin"]);
  const { theme, layout, catalogFeaturedEnabled } = await getAppSettings();

  const message =
    searchParams?.success === "theme-updated"
      ? "Tema berhasil diperbarui untuk semua orang."
      : searchParams?.success === "layout-updated"
        ? "Mode layout berhasil diperbarui untuk semua orang."
        : searchParams?.success === "catalog-featured-updated"
          ? "Pengaturan Unit Rekomendasi katalog berhasil diperbarui."
          : "";

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Pengaturan</p>
          <h1>Tampilan aplikasi</h1>
          <p className="bodyText">Berlaku untuk semua orang yang akses core.fscomp.id, di perangkat manapun — bukan cuma komputer ini. Cuma admin yang bisa mengubah.</p>
        </div>
        <Settings size={30} />
      </div>

      <FlashNotice message={message} tone="success" queryKeys={["success"]} />

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Tema &amp; Layout</p>
            <h2>Terang/gelap, dan posisi menu</h2>
          </div>
        </div>
        <SettingsPanel theme={theme} layout={layout} catalogFeaturedEnabled={catalogFeaturedEnabled} />
      </section>
    </section>
  );
}
