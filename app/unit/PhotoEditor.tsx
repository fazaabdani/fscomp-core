"use client";

import { Loader2, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type PhotoItem = { id: string; url: string; thumbUrl: string };

const ADJUST_FIELDS = [
  { key: "brightness", label: "Kecerahan (brightness)", min: 50, max: 160 },
  { key: "contrast", label: "Kontras (contrast)", min: 50, max: 160 },
  { key: "saturation", label: "Saturasi warna (saturation)", min: 0, max: 200 }
] as const;

type AdjustKey = (typeof ADJUST_FIELDS)[number]["key"];
const NEUTRAL_ADJUST: Record<AdjustKey, number> = { brightness: 100, contrast: 100, saturation: 100 };

/**
 * Editor kecerahan/kontras/saturasi. Tanpa `unitId` (dipakai di formulir unit) hasilnya hanya jadi foto baru di galeri
 * dan baru berlaku setelah formulir disimpan. Dengan `unitId` (halaman detail unit, khusus admin) foto di unit itu
 * langsung diganti di server.
 */
export function PhotoEditor({
  photo,
  unitId,
  onClose,
  onSaved
}: {
  photo: PhotoItem;
  unitId?: string;
  onClose: () => void;
  onSaved: (asset: PhotoItem) => void;
}) {
  const [adjust, setAdjust] = useState(NEUTRAL_ADJUST);
  const [showOriginal, setShowOriginal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const changed = ADJUST_FIELDS.some((field) => adjust[field.key] !== 100);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/media/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: photo.id, ...(unitId ? { unitId } : {}), ...adjust })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json.asset) {
        setError(json.error === "no-change" ? "Belum ada yang diubah." : "Gagal menyimpan foto. Coba lagi.");
        return;
      }
      onSaved({ id: json.asset.id, url: json.asset.url, thumbUrl: json.asset.thumbUrl });
    } catch {
      setError("Gagal menyimpan foto. Periksa koneksi lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const filter = showOriginal ? "none" : `brightness(${adjust.brightness}%) contrast(${adjust.contrast}%) saturate(${adjust.saturation}%)`;

  // Portal ke body: panel induk membuat stacking context sehingga tanpa portal panel lain bisa menimpa jendela ini.
  return createPortal(
    <div className="mediaPickerBackdrop" role="dialog" aria-modal="true" aria-label="Edit foto">
      <div className="mediaPickerModal photoEditorModal">
        <div className="mediaPickerHeader">
          <strong>Edit Foto</strong>
          <button type="button" className="iconButton" onClick={onClose} disabled={saving} aria-label="Tutup"><X size={18} /></button>
        </div>

        <div className="photoEditorStage">
          <img src={photo.url} alt="Pratinjau foto yang diedit" style={{ filter }} />
        </div>

        <div className="photoEditorControls">
          {ADJUST_FIELDS.map((field) => (
            <label className="photoEditorSlider" key={field.key}>
              <span>
                {field.label}
                <b>{adjust[field.key]}%</b>
              </span>
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={1}
                value={adjust[field.key]}
                onChange={(event) => setAdjust((current) => ({ ...current, [field.key]: Number(event.target.value) }))}
              />
            </label>
          ))}
        </div>

        <small className="photoEditorNote">
          {unitId
            ? "Foto asli tidak dihapus dari Media. Hasil edit langsung menggantikan foto ini di unit dan katalog."
            : "Foto asli tidak diubah. Hasil disimpan sebagai foto baru dan menggantikan foto ini di galeri unit; tekan Simpan di formulir unit untuk menerapkannya."}
        </small>
        {error ? <small className="photoEditorError" role="alert">{error}</small> : null}

        <div className="buttonRow">
          <button type="button" className="secondaryButton" onClick={() => setAdjust(NEUTRAL_ADJUST)} disabled={saving || !changed}>
            <RotateCcw size={16} /> Reset
          </button>
          <button
            type="button"
            className="secondaryButton"
            disabled={saving || !changed}
            onPointerDown={() => setShowOriginal(true)}
            onPointerUp={() => setShowOriginal(false)}
            onPointerLeave={() => setShowOriginal(false)}
            onPointerCancel={() => setShowOriginal(false)}
          >
            Tahan untuk lihat asli
          </button>
          <button type="button" className="secondaryButton" onClick={onClose} disabled={saving}>Batal</button>
          <button type="button" className="primaryButton" onClick={save} disabled={saving || !changed}>
            {saving ? <Loader2 size={16} className="spinIcon" /> : null} {saving ? "Menyimpan..." : "Simpan Foto"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
