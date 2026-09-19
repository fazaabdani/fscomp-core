import { Megaphone, Settings } from "lucide-react";
import { getAppSettings, getCatalogAnnouncement } from "@/lib/app-settings";
import { requireRole } from "@/lib/session";
import { MediaPicker } from "../unit/MediaPicker";
import { FlashNotice } from "../FlashNotice";
import { SettingsPanel } from "./SettingsPanel";
import { updateAnnouncementAction } from "./actions";

export default async function PengaturanPage({ searchParams }: { searchParams?: { success?: string } }) {
  await requireRole(["admin"]);
  const [{ theme, layout, catalogFeaturedEnabled }, announcement] = await Promise.all([
    getAppSettings(),
    getCatalogAnnouncement()
  ]);

  const message =
    searchParams?.success === "theme-updated"
      ? "Tema berhasil diperbarui untuk semua orang."
      : searchParams?.success === "layout-updated"
        ? "Mode layout berhasil diperbarui untuk semua orang."
        : searchParams?.success === "catalog-featured-updated"
          ? "Pengaturan Unit Rekomendasi katalog berhasil diperbarui."
          : searchParams?.success === "announcement-updated"
            ? "Pengumuman katalog berhasil diperbarui."
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

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Katalog</p>
            <h2>Pengumuman &amp; banner katalog</h2>
          </div>
          <Megaphone size={22} />
        </div>
        <form className="formGrid" action={updateAnnouncementAction}>
          <label>Tampilkan pengumuman di katalog
            <select name="announcementEnabled" defaultValue={announcement.enabled ? "on" : "off"}>
              <option value="off">Tidak, sembunyikan</option>
              <option value="on">Ya, tampilkan</option>
            </select>
          </label>
          <div className="formFieldGroup">Gambar pengumuman/banner
            <MediaPicker
              fieldName="announcementImageAssetId"
              initial={announcement.imageAssetId ? [{ id: announcement.imageAssetId, url: announcement.imageUrl, thumbUrl: announcement.imageThumbUrl }] : []}
            />
            <small>Opsional. Pilih satu gambar saja (misal banner promo/stok baru) — kalau pilih lebih dari satu, cuma yang pertama dipakai.</small>
          </div>
          <label>Teks pengumuman
            <textarea name="announcementText" defaultValue={announcement.text} placeholder="Contoh: 30-an unit laptop baru segera masuk hari Senin!" />
            <small>Opsional. Muncul di bawah gambar (atau sendirian kalau tidak ada gambar).</small>
          </label>
          <label>Link tujuan saat gambar/teks diklik
            <input name="announcementLink" defaultValue={announcement.link} placeholder="https://wa.me/62816660056 atau /katalog?merek=Dell" />
            <small>Opsional. Boleh link WA, link luar, atau path internal seperti /katalog.</small>
          </label>
          <button className="primaryButton" type="submit">Simpan Pengumuman</button>
        </form>
      </section>
    </section>
  );
}
