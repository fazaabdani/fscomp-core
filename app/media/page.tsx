import Link from "next/link";
import { FolderPlus, Image as ImageIcon, RefreshCcw, Trash2, Upload } from "lucide-react";
import { FlashNotice } from "@/app/FlashNotice";
import { SubmitButton } from "@/app/SubmitButton";
import { getFolderContents } from "@/lib/media-data";
import { requireRole } from "@/lib/session";
import { createFolderAction, deleteAssetAction, deleteFolderAction, migrateGoogleDrivePhotosAction, renameFolderAction, uploadMediaAction } from "./actions";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "invalid-input": "Nama folder tidak valid.",
  "no-files": "Pilih minimal satu foto untuk diupload.",
  "folder-not-empty": "Folder masih berisi subfolder atau foto. Kosongkan dulu sebelum dihapus.",
  "folder-not-found": "Folder tidak ditemukan."
};

const successMessages: Record<string, string> = {
  "folder-created": "Folder berhasil dibuat.",
  "folder-renamed": "Folder berhasil diganti nama.",
  "folder-deleted": "Folder berhasil dihapus.",
  "asset-deleted": "Foto berhasil dihapus."
};

export default async function MediaLibraryPage({
  searchParams
}: {
  searchParams?: { folder?: string; error?: string; success?: string; count?: string; migrated?: string; remaining?: string; failedUnits?: string };
}) {
  requireRole(["admin", "teknisi"]);
  const currentFolderId = searchParams?.folder || null;
  const data = await getFolderContents(currentFolderId);

  const errorMessage = searchParams?.error ? errorMessages[searchParams.error] ?? "Terjadi kesalahan." : "";
  const successMessage =
    searchParams?.success === "uploaded"
      ? `${searchParams.count ?? 0} foto berhasil diupload.`
      : searchParams?.success === "migrated"
        ? `${searchParams.migrated ?? 0} foto berhasil dimigrasi dari Google Drive.${searchParams.remaining === "more" ? " Masih ada sisa, klik lagi untuk lanjutkan." : " Semua unit sudah dicek."}`
        : searchParams?.success
          ? successMessages[searchParams.success] ?? ""
          : "";
  const failedUnits = searchParams?.failedUnits ? searchParams.failedUnits.split(",") : [];

  return (
    <section className="pageStack">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Media Foto Produk</p>
          <h1>Kelola folder & foto produk</h1>
          <p className="bodyText">Upload foto langsung ke sistem, atur ke folder merek/seri, lalu pilih dari sini pas tambah/edit unit.</p>
        </div>
      </div>

      <FlashNotice message={errorMessage} tone="error" queryKeys={["error"]} />
      <FlashNotice message={successMessage} tone="success" queryKeys={["success", "count", "migrated", "remaining", "failedUnits"]} />

      {failedUnits.length > 0 ? (
        <div className="infoBox dangerInfo">Gagal migrasi unit: {failedUnits.join(", ")} (link mungkin mati/privat, cek manual).</div>
      ) : null}

      <nav className="buttonRow">
        <Link className={currentFolderId ? "secondaryButton" : "primaryButton"} href="/media">Semua Folder</Link>
        {data.breadcrumb.map((crumb) => (
          <Link className={crumb.id === currentFolderId ? "primaryButton" : "secondaryButton"} href={`/media?folder=${crumb.id}`} key={crumb.id}>
            {crumb.name}
          </Link>
        ))}
      </nav>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Folder</p>
            <h2>{data.subfolders.length} folder di sini</h2>
          </div>
          <FolderPlus size={20} />
        </div>
        <div className="listStack">
          {data.subfolders.length === 0 ? <div className="emptyState">Belum ada subfolder.</div> : null}
          {data.subfolders.map((folder) => (
            <div className="unitListItem" key={folder.id}>
              <Link href={`/media?folder=${folder.id}`}>
                <strong>{folder.name}</strong>
                <small>{folder.folderCount} subfolder / {folder.assetCount} foto</small>
              </Link>
              <form action={deleteFolderAction.bind(null, folder.id)}>
                <SubmitButton className="iconButton" icon={<Trash2 size={15} />} iconSize={15} ariaLabel={`Hapus folder ${folder.name}`} />
              </form>
            </div>
          ))}
        </div>
        <form className="buttonRow" action={createFolderAction}>
          <input type="hidden" name="parentId" value={currentFolderId ?? ""} />
          <input name="name" placeholder="Nama folder baru (mis. Lenovo, ThinkPad T480)" required />
          <SubmitButton className="secondaryButton" icon={<FolderPlus size={16} />} pendingLabel="Membuat...">Buat Folder</SubmitButton>
        </form>
        {currentFolderId ? (
          <form className="buttonRow" action={renameFolderAction.bind(null, currentFolderId)}>
            <input name="name" placeholder="Ganti nama folder ini" defaultValue={data.folder?.name} required />
            <SubmitButton className="secondaryButton" pendingLabel="Menyimpan...">Simpan Nama</SubmitButton>
          </form>
        ) : null}
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Upload foto ke folder ini</p>
            <h2>{data.assets.length} foto di folder ini</h2>
          </div>
          <Upload size={20} />
        </div>
        <form className="buttonRow" action={uploadMediaAction} encType="multipart/form-data">
          <input type="hidden" name="folderId" value={currentFolderId ?? ""} />
          <input type="file" name="files" accept="image/*" multiple required />
          <SubmitButton icon={<Upload size={16} />} pendingLabel="Mengupload...">Upload</SubmitButton>
        </form>

        <div className="mediaGrid">
          {data.assets.length === 0 ? <div className="emptyState">Belum ada foto di folder ini.</div> : null}
          {data.assets.map((asset) => (
            <div className="mediaThumb" key={asset.id}>
              <img src={asset.thumbUrl} alt={asset.originalName} loading="lazy" />
              <form action={deleteAssetAction.bind(null, asset.id)}>
                <input type="hidden" name="folderId" value={currentFolderId ?? ""} />
                <SubmitButton className="iconButton" icon={<Trash2 size={14} />} iconSize={14} ariaLabel={`Hapus ${asset.originalName}`} />
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Migrasi dari link lama</p>
            <h2>Pindahkan foto Google Drive ke library</h2>
          </div>
          <ImageIcon size={20} />
        </div>
        <p className="bodyText">Proses unit yang masih pakai link foto Google Drive, diunduh dan disimpan ke library ini (folder otomatis dibuat per merek/seri). Diproses bertahap, klik tombolnya lagi kalau masih ada sisa.</p>
        <form action={migrateGoogleDrivePhotosAction}>
          <SubmitButton className="secondaryButton" icon={<RefreshCcw size={16} />} pendingLabel="Memigrasi foto...">Migrasi Foto dari Google Drive</SubmitButton>
        </form>
      </section>
    </section>
  );
}
