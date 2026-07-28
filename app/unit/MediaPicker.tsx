"use client";

import { Images, Loader2, Trash2, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";

type MediaAssetItem = { id: string; url: string; thumbUrl: string; originalName: string };
type MediaFolderItem = { id: string; name: string; folderCount: number; assetCount: number };
type BrowseData = {
  folder: { id: string; name: string } | null;
  breadcrumb: { id: string; name: string }[];
  subfolders: MediaFolderItem[];
  assets: MediaAssetItem[];
};

export function MediaPicker({
  fieldName,
  initial = []
}: {
  fieldName: string;
  initial?: { id: string; url: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(initial);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [data, setData] = useState<BrowseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/media/browse${folderId ? `?folder=${folderId}` : ""}`)
      .then((response) => response.json())
      .then((json: BrowseData) => setData(json))
      .finally(() => setLoading(false));
  }, [open, folderId]);

  function toggleSelect(asset: MediaAssetItem) {
    setSelected((current) =>
      current.some((item) => item.id === asset.id)
        ? current.filter((item) => item.id !== asset.id)
        : [...current, { id: asset.id, url: asset.url }]
    );
  }

  function removeSelected(id: string) {
    setSelected((current) => current.filter((item) => item.id !== id));
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("folderId", folderId ?? "");
    Array.from(files).forEach((file) => formData.append("files", file));

    try {
      const response = await fetch("/api/media/upload", { method: "POST", body: formData });
      const json = await response.json();
      if (response.ok && json.assets) {
        setSelected((current) => [...current, ...json.assets.map((asset: MediaAssetItem) => ({ id: asset.id, url: asset.url }))]);
        setData((current) => (current ? { ...current, assets: [...json.assets, ...current.assets] } : current));
      }
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="mediaPickerField">
      {selected.map((photo) => (
        <input type="hidden" name={fieldName} value={photo.id} key={photo.id} />
      ))}

      <div className="mediaPickerPreview">
        {selected.map((photo) => (
          <div className="mediaThumb" key={photo.id}>
            <img src={photo.url} alt="Foto terpilih" />
            <button type="button" className="iconButton" onClick={() => removeSelected(photo.id)} aria-label="Hapus foto dari pilihan">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="secondaryButton" onClick={() => setOpen(true)}>
        <Images size={16} /> {selected.length > 0 ? `Ubah Foto (${selected.length} dipilih)` : "Pilih dari Galeri"}
      </button>

      {open ? (
        <div className="mediaPickerBackdrop" role="dialog" aria-modal="true" aria-label="Pilih foto dari galeri">
          <div className="mediaPickerModal">
            <div className="mediaPickerHeader">
              <strong>Pilih Foto ({selected.length} dipilih)</strong>
              <button type="button" className="iconButton" onClick={() => setOpen(false)} aria-label="Tutup"><X size={18} /></button>
            </div>

            <nav className="buttonRow">
              <button type="button" className={!folderId ? "primaryButton" : "secondaryButton"} onClick={() => setFolderId(null)}>Semua Folder</button>
              {data?.breadcrumb.map((crumb) => (
                <button type="button" className={crumb.id === folderId ? "primaryButton" : "secondaryButton"} onClick={() => setFolderId(crumb.id)} key={crumb.id}>
                  {crumb.name}
                </button>
              ))}
            </nav>

            {loading ? <div className="emptyState">Memuat...</div> : null}

            {!loading && data ? (
              <>
                <div className="listStack">
                  {data.subfolders.map((folder) => (
                    <button type="button" className="mediaPickerFolderRow" onClick={() => setFolderId(folder.id)} key={folder.id}>
                      <div>
                        <strong>{folder.name}</strong>
                        <small>{folder.folderCount} subfolder / {folder.assetCount} foto</small>
                      </div>
                    </button>
                  ))}
                </div>

                <label className={`secondaryButton mediaPickerUploadButton ${uploading ? "isDisabled" : ""}`}>
                  {uploading ? <Loader2 size={16} className="spinIcon" /> : <Upload size={16} />} {uploading ? "Mengupload..." : "Upload Foto Baru ke Folder Ini"}
                  <input type="file" accept="image/*" multiple hidden disabled={uploading} onChange={handleUpload} />
                </label>

                <div className="mediaGrid">
                  {data.assets.length === 0 ? <div className="emptyState">Belum ada foto di folder ini.</div> : null}
                  {data.assets.map((asset) => {
                    const isSelected = selected.some((item) => item.id === asset.id);
                    return (
                      <button
                        type="button"
                        className={`mediaThumb mediaThumbSelectable ${isSelected ? "isSelected" : ""}`}
                        onClick={() => toggleSelect(asset)}
                        key={asset.id}
                      >
                        <img src={asset.thumbUrl} alt={asset.originalName} />
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            <div className="buttonRow">
              <button type="button" className="primaryButton" onClick={() => setOpen(false)}>Selesai</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
